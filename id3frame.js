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
     * @private {boolean}
     */
    this.isChanged_ = false;

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
   * @param {boolean=} opt_isOriginalData
   */
  setData(buffer, opt_isOriginalData) {
    if (opt_isOriginalData && buffer.length != this.originalSize_) {
      throw Error('Buffer size does not match original data size.');
    }
    this.data_ = buffer;
    this.isChanged_ = !opt_isOriginalData;
    if (this.id_ != ID3FrameId.ATTACHED_PICTURE) {
      console.log('Tag ' + this.id_ +': ' + buffer.toString());
    }
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
   * Sets the given string as data for this frame. This is only supported for
   * text information frames.
   * @param {string} value
   */
  setString(value) {
    if (!this.isTextInformationFrame()) {
      throw Error('String values are only supported for text information ' +
          'frames.');
    }
    const nonUnicodeBuffer = Buffer.from(value, NON_UNICODE_ENCODING);
    if (nonUnicodeBuffer.toString(NON_UNICODE_ENCODING) == value) {
      // If we were able to roundtrip the value properly, then non-unicode is
      // good enough.
      this.data_ = nonUnicodeBuffer;
    } else {
      this.data_ = Buffer.from(value, 'utf16le');
    }
    this.isChanged_ = true;
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
