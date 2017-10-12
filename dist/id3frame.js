"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const id3frameid_1 = require("./id3frameid");
/**
 * A model representing an ID3 frame.
 */
class ID3Frame {
    constructor(tagOrHeader, version = 3) {
        this.originalSize = 0;
        this.flags = 0;
        this.data = null;
        this.isChangedInner = false;
        const isTag = typeof tagOrHeader == 'string';
        if (version != 3) {
            this.originalVersion = version;
            this.isChangedInner = true;
        }
        this.id = isTag ? String(tagOrHeader) : '';
        if (!isTag) {
            if (this.originalVersion == 2) {
                this.processV2Header(tagOrHeader);
            }
            else {
                this.processV3Header(tagOrHeader);
            }
        }
    }
    processV2Header(header) {
        if (header[0] || header[1] || header[2]) {
            const v2Id = header.toString('ascii', 0, 3);
            const v3Id = id3frameid_1.fromV2ID(v2Id);
            this.id = v3Id ? v3Id : v2Id;
        }
        for (let i = 0; i < 3; i++) {
            this.originalSize = this.originalSize << 8;
            this.originalSize += header[3 + i];
        }
    }
    processV3Header(header) {
        if (header[0] || header[1] || header[2] || header[3]) {
            this.id = header.toString('ascii', 0, 4);
        }
        this.originalSize = header.readInt32BE(4);
        this.flags = header.readInt16BE(8);
    }
    /**
     * Returns the ID for this frame.
     */
    getId() {
        return this.id;
    }
    /**
     * Returns the original size for this frame, excluding the header.
     */
    getOriginalSize() {
        return this.originalSize;
    }
    /**
     * Returns the data for this frame, exluding the header.
     */
    getData() {
        return this.data;
    }
    /**
     * Sets the data for this frame, excluding the header.
     */
    setData(buffer, isOriginalData = false) {
        if (isOriginalData && buffer.length != this.originalSize) {
            throw Error('Buffer size does not match original data size.');
        }
        if (isOriginalData && (this.originalVersion == 2)) {
            // TODO(jpittenger): Update v2 data to v3. Attached pictures, for example,
            // are different.
        }
        this.data = buffer;
        this.isChangedInner = !isOriginalData;
    }
    /**
     * Returns a string representation of the data for this frame. This is only
     * supported for text infomration frames.
     */
    getString() {
        if (!this.isTextInformationFrame()) {
            throw Error('String values are only supported for text information ' +
                'frames.');
        }
        if (!this.data) {
            throw Error('data has not been set');
        }
        // The first bytes of the data represents the encoding; 0 for ISO-8859-1,
        // and 1 for unicode.
        const isUnicode = this.data[0];
        let offset = 1;
        if (isUnicode) {
            if (this.data.length > (offset + 1)) {
                if ((this.data[offset] == 255) &&
                    (this.data[offset + 1] == 254)) {
                    // Skip the utf16le BOM.
                    offset += 2;
                }
                else if ((this.data[offset] == 254) &&
                    (this.data[offset + 1] == 255)) {
                    throw Error('utf16be is not supported.');
                }
            }
            for (let i = offset; i < this.data.length - 1; i += 2) {
                if ((this.data[i] == 0) && (this.data[i + 1] == 0)) {
                    return this.data.toString('utf16le', offset, i);
                }
            }
            return this.data.toString('utf16le', offset);
        }
        else {
            const nullIndex = this.data.indexOf(0, offset);
            if (nullIndex < 0) {
                return this.data.toString(NON_UNICODE_ENCODING, 1);
            }
            else {
                return this.data.toString(NON_UNICODE_ENCODING, 1, nullIndex);
            }
        }
    }
    getPictureType() {
        if (!this.isAttachedPictureFrame()) {
            throw Error('Pictures are only supported for attached picture ' +
                'frames.');
        }
        if (!this.data) {
            throw Error('data has not been set');
        }
        console.log('picture frame size: ' + this.data.length);
        console.log('text encoding: ' + this.data[0]);
        for (let i = 1; i < this.data.length; i++) {
            if (!this.data[i]) {
                console.log('mime type: ' + this.data.toString(NON_UNICODE_ENCODING, 1, i + 1));
                return this.data[i + 1];
            }
        }
        throw Error('picture type not found');
    }
    /**
     * Sets the given string as data for this frame. This is only supported for
     * text information frames.
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
        }
        else {
            nonPrefixedBuffer = Buffer.from(value, 'utf16le');
            encoding = 1;
        }
        this.data = Buffer.allocUnsafeSlow(nonPrefixedBuffer.length + 1);
        this.data.writeUInt8(encoding, 0);
        nonPrefixedBuffer.copy(this.data, 1);
        this.isChangedInner = true;
    }
    /**
     * Sets the given picture data for this frame. This is only supported for
     * attached picture frames.
     */
    setPicture(pictureType, imageBuffer, mimeType = '', description = '') {
        if (!this.isAttachedPictureFrame()) {
            throw Error('Pictures are only supported for attached picture ' +
                'frames.');
        }
        let encoding = 0;
        let descriptionBuffer = Buffer.from(description, NON_UNICODE_ENCODING);
        if (descriptionBuffer.toString(NON_UNICODE_ENCODING) != description) {
            descriptionBuffer = Buffer.from(description, 'utf16le');
            encoding = 1;
        }
        const dataSize = imageBuffer.length +
            1 + // Text encoding
            (mimeType ? mimeType.length : 0) +
            1 + // Mime-type termination
            1 + // Picture type
            descriptionBuffer.length +
            (encoding ? 2 : 1); // Description termination;
        let totalSoFar = 0;
        this.data = Buffer.allocUnsafeSlow(dataSize);
        this.data.writeUInt8(encoding, totalSoFar);
        totalSoFar += 1;
        if (mimeType) {
            this.data.write(mimeType, totalSoFar);
            totalSoFar += mimeType.length;
        }
        this.data.writeUInt8(0, totalSoFar);
        totalSoFar += 1;
        this.data.writeUInt8(pictureType, totalSoFar);
        totalSoFar += 1;
        if (descriptionBuffer.length) {
            descriptionBuffer.copy(this.data, totalSoFar);
            totalSoFar += descriptionBuffer.length;
        }
        this.data.writeUInt8(0, totalSoFar);
        totalSoFar += 1;
        if (encoding) {
            this.data.writeUInt8(0, totalSoFar);
            totalSoFar += 1;
        }
        imageBuffer.copy(this.data, totalSoFar);
    }
    /**
     * Returns whether this is frame's data is text.
     * @see http://id3.org/id3v2.3.0#Text_information_frames
     */
    isTextInformationFrame() {
        return this.id[0] == 'T';
    }
    /**
     * Returns whether this is frame's data is an attached picture.
     * @see http://id3.org/id3v2.3.0#Attached_picture
     */
    isAttachedPictureFrame() {
        return this.id == id3frameid_1.ID3FrameId.ATTACHED_PICTURE;
    }
    /**
     * Returns whether this frame consists entirely of 0 bytes.
     */
    isEmpty() {
        return !this.id && !this.originalSize && !this.flags;
    }
    /**
     * Returns whether this frame has changed since it was initialized.
     */
    isChanged() {
        return this.isChangedInner;
    }
    /**
     * Writes the header to the given output stream.
     */
    writeFrame(writeStream) {
        if (!this.data || !this.data.length) {
            // Frames with no data are stripped.
            return;
        }
        const buffer = new Buffer(HEADER_SIZE);
        buffer.write(this.id, undefined, undefined, 'ascii');
        buffer.writeInt32BE(this.data.length, 4);
        buffer.writeInt16BE(this.flags, 8);
        writeStream.write(buffer);
        writeStream.write(this.data);
    }
}
exports.ID3Frame = ID3Frame;
/**
 * The number of bytes used to represent the frame header.
 */
const HEADER_SIZE = 10;
const TAG_ALTER_FLAG = 1 << 15;
const FILE_ALTER_FLAG = 1 << 14;
const READ_ONLY_FLAG = 1 << 13;
const COMPRESSION_FLAG = 1 << 7;
const ENCRYPTION_FLAG = 1 << 6;
const GROUPING_IDENTITY_FLAG = 1 << 5;
const NON_UNICODE_ENCODING = 'binary';
//# sourceMappingURL=id3frame.js.map