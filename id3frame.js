'use strict';

const ID3FrameId = require('./id3frameid.js');
const os = require('os');

/**
 * A model representing an ID3 frame.
 */
class ID3Frame {
  /**
   * @param {!Buffer|string} tagOrHeader
   * @param {number=} opt_version
   */
  constructor(tagOrHeader, opt_version) {
    const isTag = typeof tagOrHeader == 'string';

    /**
     * @private {number}
     */
    this.originalVersion_ = opt_version || 3;

    /**
     * @private {?string}
     */
    this.id_ = isTag ? tagOrHeader : '';

    /**
     * @private {number}
     */
    this.originalSize_ = 0;

    /**
     * @private {number}
     */
    this.flags_ = 0;

    /**
     * @private {?Buffer}
     */
    this.data_ = null;

    /**
     * Whether this frame has changed since it was originally read. Since frames
     * are always represent as v2.3, any other version of frame is considered
     * changed immediately.
     * @private {boolean}
     */
    this.isChanged_ = (this.originalVersion_ != 3);

    if (!isTag) {
      if (this.originalVersion_ == 2) {
        this.processV2Header_(tagOrHeader);
      } else {
        this.processV3Header_(tagOrHeader);
      }
    }
  }

  /**
   * @param {!Buffer} header
   * @private
   */
  processV2Header_(header) {
    if (header[0] || header[1] || header[2]) {
      const v2Id = header.toString('ascii', 0, 3);
      const v3Id = ID3FrameId.fromV2ID(v2Id);
      this.id_ = v3Id ? v3Id : v2Id;
    }
    for (let i = 0; i < 3; i++) {
      this.originalSize_ = this.originalSize_ << 8;
      this.originalSize_ += header[3 + i];
    }
  }

  /**
   * @param {!Buffer} header
   * @private
   */
  processV3Header_(header) {
    if (header[0] || header[1] || header[2] || header[3]) {
      this.id_ = header.toString('ascii', 0, 4);
    }
    this.originalSize_ = header.readInt32BE(4);
    this.flags_ = header.readInt16BE(8);
  }

  /**
   * Returns the ID for this frame.
   * @return {string}
   */
  getId() {
    return this.id_;
  }

  /**
   * Returns the original size for this frame, excluding the header.
   * @return {number}
   */
  getOriginalSize() {
    return this.originalSize_;
  }

  /**
   * Returns the data for this frame, exluding the header.
   * @return {!Buffer} buffer
   */
  getData() {
    return this.data_;
  }

  /**
   * Sets the data for this frame, excluding the header.
   * @param {!Buffer} buffer
   * @param {boolean=} isOriginalData
   */
  setData(buffer, isOriginalData = false) {
    if (isOriginalData && buffer.length != this.originalSize_) {
      throw Error('Buffer size does not match original data size.');
    }
    if (isOriginalData && (this.originalVerion_ == 2)) {
      // TODO(jpittenger): Update v2 data to v3. Attached pictures, for example,
      // are different.
    }
    this.data_ = buffer;
    this.isChanged_ = !isOriginalData;
  }

  /**
   * Returns a string representation of the data for this frame. This is only
   * supported for text infomration frames.
   * @return {string}
   */
  getString() {
    if (!this.isTextInformationFrame()) {
      throw Error('String values are only supported for text information ' +
          'frames.');
    }
    // The first bytes of the data represents the encoding; 0 for ISO-8859-1,
    // and 1 for unicode.
    const isUnicode = this.data_[0];
    let offset = 1;
    if (isUnicode) {
      if (this.data_.length > (offset + 1)) {
        if ((this.data_[offset] == 255) &&
            (this.data_[offset + 1] == 254)) {
          // Skip the utf16le BOM.
          offset += 2;
        } else if ((this.data_[offset] == 254) &&
            (this.data_[offset + 1] == 255)) {
          throw Error('utf16be is not supported.');
        }
      }
      for (let i = offset; i < this.data_.length - 1; i += 2) {
        if ((this.data_[i] == 0) && (this.data_[i + 1] == 0)) {
          return this.data_.toString('utf16le', offset, i);
        }
      }
      return this.data_.toString('utf16le', offset);
    } else {
      const nullIndex = this.data_.indexOf(0, offset);
      if (nullIndex < 0) {
        return this.data_.toString(NON_UNICODE_ENCODING, 1);
      } else {
        return this.data_.toString(NON_UNICODE_ENCODING, 1, nullIndex);
      }
    }
  }

  /**
   * @return {number}
   */
  getPictureType() {
    if (!this.isAttachedPictureFrame()) {
      throw Error('Pictures are only supported for attached picture ' +
          'frames.');
    }
    console.log('picture frame size: ' + this.data_.length);
    console.log('text encoding: ' + this.data_[0]);
    for (let i = 1; i < this.data_.length; i++) {
      if (!this.data_[i]) {
        console.log('mime type: ' + this.data_.toString(NON_UNICODE_ENCODING, 1, i+1));
        return this.data_[i + 1];
      }
    }
  }

  /**
   * Sets the given string as data for this frame. This is only supported for
   * text information frames.
   * @param {string} value
   */
  setString(value) {
    if (!this.isTextInformationFrame()) {
      throw Error('String values are only supported for text information ' +
          'frames.');
    }
    let nonPrefixedBuffer;
    let encoding = 0;
    const nonUnicodeBuffer = Buffer.from(value, NON_UNICODE_ENCODING);
    if (nonUnicodeBuffer.toString(NON_UNICODE_ENCODING) == value) {
      // If we were able to roundtrip the value properly, then non-unicode is
      // good enough.
      nonPrefixedBuffer = nonUnicodeBuffer;
    } else {
      nonPrefixedBuffer = Buffer.from(value, 'utf16le');
      encoding = 1;
    }
    this.data_ = Buffer.allocUnsafeSlow(nonPrefixedBuffer.length + 1);
    this.data_.writeUInt8(encoding, 0);
    nonPrefixedBuffer.copy(this.data_, 1);
    this.isChanged_ = true;
  }

  /**
   * Sets the given picture data for this frame. This is only supported for
   * attached picture frames.
   * @param {!ID3PictureType} pictureType
   * @param {!Buffer} imageBuffer
   * @param {string=} opt_mimeType
   * @param {string=} opt_description
   */
  setPicture(pictureType, imageBuffer, opt_mimeType, opt_description) {
    if (!this.isAttachedPictureFrame()) {
      throw Error('Pictures are only supported for attached picture ' +
          'frames.');
    }

    let encoding = 0;
    let descriptionBuffer =
        opt_description && Buffer.from(opt_description, NON_UNICODE_ENCODING);
    if (opt_description &&
        descriptionBuffer.toString(NON_UNICODE_ENCODING) != opt_description) {
      descriptionBuffer = Buffer.from(opt_description, 'utf16le');
      encoding = 1;
    }
    const dataSize = imageBuffer.length +
        1 + // Text encoding
        (opt_mimeType ? opt_mimeType.length : 0) +
        1 + // Mime-type termination
        1 + // Picture type
        (opt_description ? descriptionBuffer.length : 0) +
        (encoding ? 2 : 1);  // Description termination;

    let totalSoFar = 0;
    this.data_ = Buffer.allocUnsafeSlow(dataSize);
    this.data_.writeUInt8(encoding, totalSoFar);
    totalSoFar += 1;
    if (opt_mimeType) {
      this.data_.write(opt_mimeType, totalSoFar);
      totalSoFar += opt_mimeType.length;
    }
    this.data_.writeUInt8(0, totalSoFar);
    totalSoFar += 1;
    this.data_.writeUInt8(pictureType, totalSoFar);
    totalSoFar += 1;
    if (opt_description) {
      descriptionBuffer.copy(this.data_, totalSoFar);
      totalSoFar += descriptionBuffer.length;
    }
    this.data_.writeUInt8(0, totalSoFar);
    totalSoFar += 1;
    if (encoding) {
      this.data_.writeUInt8(0, totalSoFar);
      totalSoFar += 1;
    }
    imageBuffer.copy(this.data_, totalSoFar);
  }

  /**
   * Returns whether this is frame's data is text.
   * @return {boolean}
   * @see http://id3.org/id3v2.3.0#Text_information_frames
   */
  isTextInformationFrame() {
    return this.id_[0] == 'T';
  }

  /**
   * Returns whether this is frame's data is an attached picture.
   * @return {boolean}
   * @see http://id3.org/id3v2.3.0#Attached_picture
   */
  isAttachedPictureFrame() {
    return this.id_ == ID3FrameId.ATTACHED_PICTURE;
  }

  /**
   * Returns whether this frame consists entirely of 0 bytes.
   */
  isEmpty() {
    return !this.id_ && !this.originalSize_ && !this.flags_;
  }

  /**
   * Returns whether this frame has changed since it was initialized.
   * @return {boolean}
   */
  isChanged() {
    return this.isChanged_;
  }

  /**
   * Writes the header to the given output stream.
   * @param {!stream.Writable} writeStream
   */
  writeFrame(writeStream) {
    if (!this.data_ || !this.data_.length) {
      // Frames with no data are stripped.
      return;
    }
    const buffer = new Buffer(HEADER_SIZE);
    buffer.write(this.id_, 'ascii');
    buffer.writeInt32BE(this.data_.length, 4);
    buffer.writeInt16BE(this.flags_, 8);
    writeStream.write(buffer);
    writeStream.write(this.data_);
  }
}

/**
 * The number of bytes used to represent the frame header.
 * @type {number}
 */
const HEADER_SIZE = 10;

const TAG_ALTER_FLAG = 1 << 15;
const FILE_ALTER_FLAG = 1 << 14;
const READ_ONLY_FLAG = 1 << 13;
const COMPRESSION_FLAG = 1 << 7;
const ENCRYPTION_FLAG = 1 << 6;
const GROUPING_IDENTITY_FLAG = 1 << 5;

const NON_UNICODE_ENCODING = 'binary';


module.exports = ID3Frame;
