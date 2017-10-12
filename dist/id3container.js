"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const id3frame_1 = require("./id3frame");
const fs = require("fs");
/**
 * A model representing an ID3 container.
 */
class ID3Container {
    constructor(container) {
        this.isHeaderRead = false;
        this.framesById = new Map();
        this.currentFrame = null;
        this.isDone = false;
        this.error = undefined;
        this.version = 3;
        this.revision = 0;
        this.flags = 0;
        this.originalTagSize = 0;
        this.paddingSize = 0;
        this.tagBytesRemaining = 0;
        const containerType = typeof container;
        if (containerType == 'string') {
            const containerStats = fs.statSync(String(container));
            if (!containerStats.isFile()) {
                throw Error('Container is not a file: ' + container);
            }
            this.readStream = fs.createReadStream(String(container));
        }
        else {
            this.readStream = container;
        }
        this.readStream.on('readable', () => {
            this.onReadable();
        });
    }
    /**
     * Specifies a callback to be invoked when this ID3 container is done loading.
     * If loading is already done, then the callback will be invoked immediately.
     */
    onDone(callback) {
        this.onDoneCallback = callback;
        if (this.isDone || this.error) {
            callback(this.error);
        }
    }
    /**
     * Returns the frame IDs represented in this tag.
     */
    getFrameIds() {
        return [...this.framesById.keys()];
    }
    /**
     * Returns the frame for the given ID, or {@code null} if no such frame could
     * be found.
     */
    getFrame(id, createIfMissing = false) {
        if (createIfMissing && !this.framesById.has(id)) {
            this.framesById.set(id, new id3frame_1.ID3Frame(id));
        }
        return this.framesById.get(id) || null;
    }
    /**
     * Writes the current tag data.
     */
    write(callback, container) {
        const containerType = typeof container;
        const useExistingPath = !container ||
            (containerType == 'string' && container == this.readStream.path);
        let totalFrameSize = 0;
        let didFramesChange = false;
        for (const frame of this.framesById.values()) {
            didFramesChange = didFramesChange || frame.isChanged();
            // Only write a frame if it has some data.
            const frameData = frame.getData();
            if (frameData && frameData.length) {
                totalFrameSize += (HEADER_SIZE + frameData.length);
            }
        }
        if (useExistingPath && !didFramesChange) {
            // No frame changes, so nothing to do.
            callback();
            return;
        }
        let readStream = null;
        let writeStream = null;
        let newPaddingSize = 512;
        try {
            if (!useExistingPath) {
                writeStream = (containerType == 'string') ?
                    fs.createWriteStream(String(container), {
                        flags: 'w+',
                    }) :
                    container;
                // Start reading from the original file, but skipping the old tags.
                readStream = fs.createReadStream(this.readStream.path, {
                    start: this.originalTagSize
                });
            }
            else if (totalFrameSize > this.originalTagSize) {
                // We can't write in-place; create a new temp file for the results.
                throw Error('Writing to a file without enough pre-existing tag space ' +
                    'is not yet supported:' + container);
            }
            else {
                // We're writing the tags in place, so the new padding size is
                // determined by the difference of the new tags and the original ones.
                newPaddingSize = this.originalTagSize - totalFrameSize;
                writeStream = fs.createWriteStream(this.readStream.path, {
                    flags: 'r+',
                });
            }
            this.writeHeader(writeStream, totalFrameSize);
            for (const frame of this.framesById.values()) {
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
                callback();
                return;
            }
        }
        catch (err) {
            console.error('Exception writing ID3 tags; ' + container + ':' + err);
            callback(err);
            return;
        }
        readStream.on('error', (err) => {
            console.error('Error reading file on ID3 write: ' + container + ':' + err);
            callback(err);
            if (readStream) {
                readStream.close();
                readStream = null;
            }
            if (writeStream) {
                writeStream.close();
                writeStream = null;
            }
        });
        writeStream.on('error', (err) => {
            console.error('Error writing file on ID3 write: ' + container + ':' + err);
            callback(err);
            if (readStream) {
                readStream.close();
                readStream = null;
            }
            if (writeStream) {
                writeStream.close();
                writeStream = null;
            }
        });
        writeStream.on('finish', () => {
            callback();
        });
        readStream.pipe(writeStream);
    }
    onReadable() {
        if (this.error || this.isDone) {
            return;
        }
        try {
            if (!this.isHeaderRead) {
                // We're still reading the header, so try to read it.
                this.isHeaderRead = this.parseHeader();
            }
            while (this.isHeaderRead && !this.error && !this.paddingSize &&
                (this.tagBytesRemaining > 0)) {
                if (!this.parseFrame()) {
                    // We couldn't finish a frame, so wait until we have more bytes.
                    break;
                }
            }
            if (this.paddingSize) {
                // We've hit padding, so make sure the remaining bytes are padding as
                // well.
                const remainingBytes = this.readStream.read(this.tagBytesRemaining);
                if (remainingBytes) {
                    if (remainingBytes.some((byte) => {
                        return !!byte;
                    })) {
                        throw Error('Non-zero byte found after padding.');
                    }
                    this.paddingSize += remainingBytes.length;
                    this.tagBytesRemaining -= remainingBytes.length;
                }
            }
            if (this.tagBytesRemaining <= 0) {
                this.isDone = true;
                this.readStream.close();
                if (this.onDoneCallback) {
                    this.onDoneCallback(this.error);
                }
                return;
            }
        }
        catch (err) {
            console.error(err);
            this.error = err;
            if (this.onDoneCallback) {
                this.onDoneCallback(this.error);
            }
        }
    }
    parseHeader() {
        const header = this.readStream.read(HEADER_SIZE);
        if (!header) {
            return false;
        }
        const headerPrefix = header.toString('utf8', 0, 3);
        if (headerPrefix != 'ID3') {
            // This file has no ID3 header, so keep the default values.
            return true;
        }
        this.version = header[3];
        if (this.version != 2 && this.version != 3) {
            throw Error('Only ID3 versions 2.2 and 2.3 are supported');
        }
        this.revision = header[4];
        this.flags = header[5];
        if (this.flags & EXTENDED_FLAG) {
            throw Error('ID3 tags with extended headers are not supported.');
        }
        if (this.flags & EXPERIMENTAL_FLAG) {
            throw Error('Experimental ID3 tags are not supported.');
        }
        if (this.flags & ~(UNSYNC_FLAG | EXTENDED_FLAG | EXPERIMENTAL_FLAG)) {
            throw Error('Flags other than UNSYNC, EXTENDED, and EXPERIMENTAL are ' +
                'are not supported.');
        }
        // Tag size is 4 bytes, big the most significant bit of each is ignored, and
        // should always be zero.
        this.originalTagSize = 0;
        for (let i = 6; i < HEADER_SIZE; i++) {
            if (header[i] > 128) {
                throw Error('A most-significant bit of 1 was encountered in the ID3 tag size.');
            }
            this.originalTagSize = this.originalTagSize << 7;
            this.originalTagSize += header[i];
        }
        this.tagBytesRemaining = this.originalTagSize;
        return true;
    }
    /**
     * Writes the header to the given output stream.
     */
    writeHeader(writeStream, totalSize) {
        const buffer = new Buffer(HEADER_SIZE);
        buffer.write('ID3');
        // Although different versions of ID3 may be read, v2.3.0 is written
        // unconditionally.
        buffer[3] = 3;
        buffer[4] = 0;
        buffer[5] = this.flags;
        let remainingSize = totalSize;
        for (let i = HEADER_SIZE - 1; i >= 6; i--) {
            buffer[i] = remainingSize % 128;
            remainingSize = remainingSize >> 7;
        }
        writeStream.write(buffer);
    }
    /**
     * Returns the size of each frame header.
     */
    getFrameHeaderSize() {
        if (this.version == 2) {
            // ID3v2.2 only uses 6 bytes for the frame header.
            return 6;
        }
        else {
            return 10;
        }
    }
    parseFrame() {
        if (!this.currentFrame) {
            const frameHeaderSize = this.getFrameHeaderSize();
            const frameHeader = this.readStream.read(frameHeaderSize);
            if (!frameHeader) {
                return false;
            }
            this.tagBytesRemaining -= frameHeaderSize;
            this.currentFrame = new id3frame_1.ID3Frame(frameHeader, this.version);
        }
        const frameSize = this.currentFrame.getOriginalSize();
        if (frameSize) {
            const frameData = this.readStream.read(frameSize);
            if (!frameData) {
                // We can't finish building this frame.
                return false;
            }
            this.tagBytesRemaining -= frameSize;
            this.currentFrame.setData(frameData, true);
        }
        if (this.currentFrame.isEmpty()) {
            this.paddingSize += HEADER_SIZE;
        }
        else {
            // if (this.framesById.has(this.currentFrame.getId())) {
            //   console.log('found duplicate frame: ' + this.currentFrame.getId());
            // }
            this.framesById.set(this.currentFrame.getId(), this.currentFrame);
        }
        this.currentFrame = null;
        return true;
    }
    /**
     * Returns the number of bytes required to store the current frames.
     */
    getTotalFrameSize() {
        return [...this.framesById.values()].reduce((soFar, frame) => {
            const frameData = frame.getData();
            return soFar + HEADER_SIZE + (frameData ? frameData.length : 0);
        }, 0);
    }
}
exports.ID3Container = ID3Container;
const HEADER_SIZE = 10;
const UNSYNC_FLAG = 1 << 7;
const EXTENDED_FLAG = 1 << 6;
const EXPERIMENTAL_FLAG = 1 << 5;
//# sourceMappingURL=id3container.js.map