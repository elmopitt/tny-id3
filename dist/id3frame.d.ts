/// <reference types="node" />
import { ID3PictureType } from './id3picturetype';
import { Writable } from 'stream';
/**
 * A model representing an ID3 frame.
 */
export declare class ID3Frame {
    private originalVersion;
    private originalSize;
    private id;
    private flags;
    private data;
    private isChangedInner;
    constructor(tagOrHeader: Buffer | string, version?: number);
    private processV2Header(header);
    private processV3Header(header);
    /**
     * Returns the ID for this frame.
     */
    getId(): string;
    /**
     * Returns the original size for this frame, excluding the header.
     */
    getOriginalSize(): number;
    /**
     * Returns the data for this frame, exluding the header.
     */
    getData(): Buffer | null;
    /**
     * Sets the data for this frame, excluding the header.
     */
    setData(buffer: Buffer, isOriginalData?: boolean): void;
    /**
     * Returns a string representation of the data for this frame. This is only
     * supported for text infomration frames.
     */
    getString(): string;
    getPictureType(): number;
    /**
     * Sets the given string as data for this frame. This is only supported for
     * text information frames.
     */
    setString(value: string): void;
    /**
     * Sets the given picture data for this frame. This is only supported for
     * attached picture frames.
     */
    setPicture(pictureType: ID3PictureType, imageBuffer: Buffer, mimeType?: string, description?: string): void;
    /**
     * Returns whether this is frame's data is text.
     * @see http://id3.org/id3v2.3.0#Text_information_frames
     */
    isTextInformationFrame(): boolean;
    /**
     * Returns whether this is frame's data is an attached picture.
     * @see http://id3.org/id3v2.3.0#Attached_picture
     */
    isAttachedPictureFrame(): boolean;
    /**
     * Returns whether this frame consists entirely of 0 bytes.
     */
    isEmpty(): boolean;
    /**
     * Returns whether this frame has changed since it was initialized.
     */
    isChanged(): boolean;
    /**
     * Writes the header to the given output stream.
     */
    writeFrame(writeStream: Writable): void;
}
