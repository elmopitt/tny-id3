'use strict';

const ID3Frame = require('./id3frame.js');
const fs = require('fs');
const stream = require('stream');

/**
 * A model representing an ID3 container.
 */
class ID3Container {
  /**
   * @param {string|!stream.ReadStream} container
   */
  constructor(container) {
    /**
     * @private {?function(!ID3Container): void}
     */
    this.onDoneCallback_ = null;

    /**
     * @private {!stream.ReadStream}
     */
    this.readStream_;

    /**
     * @private {boolean}
     */
    this.isHeaderRead_ = false;

    /**
     * @private {!Map<string, !ID3Frame}
     */
    this.framesById_ = new Map();

    /**
     * @private {?ID3Frame}
     */
    this.currentFrame_ = null;

    /**
     * @private {boolean}
     */
    this.isDone_ = false;

    /**
     * @private {*}
     */
    this.error_ = null;

    /**
     * The ID3 version, as described in the header.
     * @private {number}
     */
    this.version_ = 3;

    /**
     * The ID3 revision, as described in the header.
     * @private {number}
     */
    this.revision_ = 0;

    /**
     * The ID3 flags, as described in the header.
     * @private {number}
     */
    this.flags_ = 0;

    /**
     * The ID3 tag size (excluding the header), as described in the header.
     * @private {number}
     */
    this.originalTagSize_ = 0;

    /**
     * The amount of padding bytes available when this tag was parsed.
     * @private {number}
     */
    this.paddingSize_ = 0;

    /**
     * The number of tag bytes remaining to be read from readStream_.
     * @private
     */
    this.tagBytesRemaining_ = 0;

    const containerType = typeof container;
    if (containerType == 'string') {
      const containerStats = fs.statSync(container);
      if (!containerStats.isFile()) {
        throw Error('Container is not a file: ' + container);
      }
      this.readStream_ = fs.createReadStream(container);
    } else if (containerType == stream.ReadStream) {
      this.readStream_ = container;
    } else {
      throw Error('Unsupported ID3 container type: ' + containerType);
    }

    this.readStream_.on('end', () => {
      this.isDone_ = true;
      this.onReadable_();
    });

    this.readStream_.on('readable', () => {
      this.onReadable_();
    });
  }

  /**
   * Specifies a callback to be invoked when this ID3 container is done loading.
   * If loading is already done, then the callback will be invoked immediately.
   * @param {function(*): void} callback
   */
  onDone(callback) {
    this.onDoneCallback_ = callback;
    if (this.isDone_ || this.error_) {
      callback(this.error_);
    }
  }

  /**
   * Returns the frame IDs represented in this tag.
   * @return {!Array<string>}
   */
  getFrameIds() {
    return Array.from(this.framesById_.keys());
  }

  /**
   * Returns the frame for the given ID, or {@code null} if no such frame could
   * be found.
   * @param {!ID3FrameId} id
   * @param {boolean=} opt_createIfMissing
   * @return {?ID3Frame}
   */
  getFrame(id, opt_createIfMissing) {
    if (opt_createIfMissing && !this.framesById_.has(id)) {
      this.framesById_.set(id, new ID3Frame(id));
    }
    return this.framesById_.get(id) || null;
  }

  /**
   * Writes the current tag data.
   * @param {function(*|undefined):void} callback
   * @param {string|!stream.Writable=} opt_container
   */
  write(callback, opt_container) {
    const containerType = typeof opt_container;
    const useExistingPath = !opt_container ||
        (containerType == 'string' && opt_container == this.readStream_.path);
    let totalFrameSize = 0;
    let didFramesChange = false;
    for (const frame of this.framesById_.values()) {
      didFramesChange = didFramesChange || frame.isChanged();

      // Only write a frame if it has some data.
      if (frame.getData() && frame.getData().length) {
        totalFrameSize += (HEADER_SIZE + frame.getData().length);
      }
    }
    if (useExistingPath && !didFramesChange) {
      // No frame changes, so nothing to do.
      callback(null);
      return;
    }
    let readStream = null;
    let writeStream = null;
    let newPaddingSize = 512;
    try {
      if (!useExistingPath) {
        writeStream = (containerType == 'string') ?
            fs.createWriteStream(
                opt_container,
                {
                  flags: 'w+',
                }) :
            opt_container;
        // Start reading from the original file, but skipping the old tags.
        readStream = fs.createReadStream(
            this.readStream_.path,
            {
              start: this.originalTagSize_
            });
      } else if (totalFrameSize > this.originalTagSize_) {
        // We can't write in-place; create a new temp file for the results.
        throw Error('Writing to a file without enough pre-existing tag space ' +
            'is not yet supported:' + opt_container);
      } else {
        // We're writing the tags in place, so the new padding size is
        // determined by the difference of the new tags and the original ones.
        newPaddingSize = this.originalTagSize_ - totalFrameSize;
        writeStream = fs.createWriteStream(
          this.readStream_.path,
          {
            flags: 'r+',
          });
      }
      this.writeHeader_(writeStream, totalFrameSize);

      for (const frame of this.framesById_.values()) {
        frame.writeFrame(writeStream);
      }

      const paddingBuffer = new Buffer(1);
      paddingBuffer[0] = 0;
      for (let i = 0; i < newPaddingSize; i++) {
        writeStream.write(paddingBuffer);
      }
      if (!readStream) {
        // We're done already!
        writeStream.close();
        callback(null);
        return;
      }
    } catch (err) {
      console.error('Exception writing ID3 tags; ' + opt_container +':' + err);
      callback(err);
    }

    readStream.on('error', (err) => {
      console.error(
          'Error reading file on ID3 write: ' + opt_container +':' + err);
      callback(err);
      readStream.close();
      writeStream.close();
    });
    writeStream.on('error', (err) => {
      console.error(
          'Error writing file on ID3 write: ' + opt_container +':' + err);
      callback(err);
      readStream.close();
      writeStream.close();
    });
    writeStream.on('finish', () => {
      callback(null);
    });

    readStream.pipe(writeStream);
  }

  /**
   * @private
   */
  onReadable_() {
    if (this.error_) {
      return;
    }
    try {
      if (!this.isHeaderRead_) {
        // We're still reading the header, so try to read it.
        this.isHeaderRead_ = this.parseHeader_();
      }
      while (this.isHeaderRead_ && !this.isError && !this.paddingSize_ &&
          (this.tagBytesRemaining_ > 0)) {
        if (!this.parseFrame_()) {
          // We couldn't finish a frame, so wait until we have more bytes.
          break;
        }
      }
      if (this.paddingSize_) {
        // We've hit padding, so make sure the remaining bytes are padding as
        // well.
        const remainingBytes = this.readStream_.read(this.tagBytesRemaining_);
        if (remainingBytes) {
          if (remainingBytes.some(
              (byte) => {
                return !!byte;
              })) {
            throw Error('Non-zero byte found after padding.');
          }
          this.paddingSize_ += remainingBytes.length;
          this.tagBytesRemaining_ -= remainingBytes.length;
        }
      }
      if (this.tagBytesRemaining_ <= 0) {
        this.isDone_ = true;
        this.readStream_.close();
        if (this.onDoneCallback_) {
          this.onDoneCallback_(this.error_);
        }
        return;
      }
    } catch (err) {
      console.error(err);
      this.error_ = err;
      if (this.onDoneCallback_) {
        this.onDoneCallback_(this.error_);
      }
    }
  }

  /**
   * @return {boolean}
   * @private
   */
  parseHeader_() {
    const header = this.readStream_.read(HEADER_SIZE);
    if (!header) {
      return false;
    }

    const headerPrefix = header.toString('utf8', 0, 3);
    if (headerPrefix != 'ID3') {
      // This file has no ID3 header, so keep the default values.
      return true;
    }

    this.version_ = header[3];
    if (this.version_ != 2 && this.version_ != 3) {
      throw Error('Only ID3 versions 2.2 and 2.3 are supported');
    }
    this.revision_ = header[4];
    this.flags_ = header[5];
    if (this.flags_ & EXTENDED_FLAG) {
      throw Error('ID3 tags with extended headers are not supported.');
    }
    if (this.flags_ & EXPERIMENTAL_FLAG) {
      throw Error('Experimental ID3 tags are not supported.');
    }
    if (this.flags_ & ~(UNSYNC_FLAG | EXTENDED_FLAG | EXPERIMENTAL_FLAG)) {
      throw Error('Flags other than UNSYNC, EXTENDED, and EXPERIMENTAL are ' +
          'are not supported.');
    }

    // Tag size is 4 bytes, big the most significant bit of each is ignored, and
    // should always be zero.
    this.originalTagSize_ = 0;
    for (let i = 6; i < HEADER_SIZE; i++) {
      if (header[i] > 128) {
        throw Error(
            'A most-significant bit of 1 was encountered in the ID3 tag size.');
      }
      this.originalTagSize_ = this.originalTagSize_ << 7;
      this.originalTagSize_ += header[i];
    }
    this.tagBytesRemaining_ = this.originalTagSize_;

    return true;
  }

  /**
   * Writes the header to the given output stream.
   * @param {!stream.Writable} writeStream
   * @param {number} totalSize
   * @private
   */
  writeHeader_(writeStream, totalSize) {
    const buffer = new Buffer(HEADER_SIZE);
    buffer.write('ID3');

    // Although different versions of ID3 may be read, v2.3.0 is written
    // unconditionally.
    buffer[3] = 3;
    buffer[4] = 0;

    buffer[5] = this.flags_;
    let remainingSize = totalSize;
    for (let i = HEADER_SIZE - 1; i >= 6; i--) {
      buffer[i] = remainingSize % 128;
      remainingSize = remainingSize >> 7;
    }
    writeStream.write(buffer);
  }

  /**
   * Returns the size of each frame header.
   * @return {number}
   * @private
   */
  getFrameHeaderSize() {
    if (this.version_ == 2) {
      // ID3v2.2 only uses 6 bytes for the frame header.
      return 6;
    } else {
      return 10;
    }
  }

  /**
   * @return {boolean}
   * @private
   */
  parseFrame_() {
    if (!this.currentFrame_) {
      const frameHeaderSize = this.getFrameHeaderSize();
      const frameHeader = this.readStream_.read(frameHeaderSize);
      if (!frameHeader) {
        return false;
      }
      this.tagBytesRemaining_ -= frameHeaderSize;
      this.currentFrame_ = new ID3Frame(frameHeader, this.version_);
    }
    const frameSize = this.currentFrame_.getOriginalSize();
    if (frameSize) {
      const frameData = this.readStream_.read(frameSize);
      if (!frameData) {
        // We can't finish building this frame.
        return false;
      }
      this.tagBytesRemaining_ -= frameSize;
      this.currentFrame_.setData(frameData, true);
    }

    if (this.currentFrame_.isEmpty()) {
      this.paddingSize_ += HEADER_SIZE;
    } else {
      // if (this.framesById_.has(this.currentFrame_.getId())) {
      //   console.log('found duplicate frame: ' + this.currentFrame_.getId());
      // }
      this.framesById_.set(this.currentFrame_.getId(), this.currentFrame_);
    }
    this.currentFrame_ = null;
    return true;
  }

  /**
   * Returns the number of bytes required to store the current frames.
   * @return {number}
   * @private
   */
  getTotalFrameSize_() {
    return Array.from(this.framesById_.values()).reduce((soFar, frame) => {
      return soFar + HEADER_SIZE + frame.getData().length;
    }, 0);
  }
}

const HEADER_SIZE = 10;

const UNSYNC_FLAG = 1 << 7;
const EXTENDED_FLAG = 1 << 6;
const EXPERIMENTAL_FLAG = 1 << 5;

module.exports = ID3Container;
