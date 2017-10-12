/// <reference types="node" />
import { ID3Frame } from './id3frame';
import { ID3FrameId } from './id3frameid';
import * as fs from 'fs';
/**
 * A model representing an ID3 container.
 */
export declare class ID3Container {
    private onDoneCallback;
    private readStream;
    private isHeaderRead;
    private readonly framesById;
    private currentFrame;
    private isDone;
    private error;
    private version;
    private revision;
    private flags;
    private originalTagSize;
    private paddingSize;
    private tagBytesRemaining;
    constructor(container: string | fs.ReadStream);
    /**
     * Specifies a callback to be invoked when this ID3 container is done loading.
     * If loading is already done, then the callback will be invoked immediately.
     */
    onDone(callback: (error?: Error) => void): void;
    /**
     * Returns the frame IDs represented in this tag.
     */
    getFrameIds(): string[];
    /**
     * Returns the frame for the given ID, or {@code null} if no such frame could
     * be found.
     */
    getFrame(id: ID3FrameId, createIfMissing?: boolean): ID3Frame | null;
    /**
     * Writes the current tag data.
     */
    write(callback: (error?: Error) => void, container?: string | fs.WriteStream): void;
    private onReadable();
    private parseHeader();
    /**
     * Writes the header to the given output stream.
     */
    private writeHeader(writeStream, totalSize);
    /**
     * Returns the size of each frame header.
     */
    getFrameHeaderSize(): number;
    private parseFrame();
    /**
     * Returns the number of bytes required to store the current frames.
     */
    getTotalFrameSize(): number;
}
