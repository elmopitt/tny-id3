/**
 * An enumeration of known ID3 field IDs.
 */
export declare enum ID3FrameId {
    ACCOMPANIMENT = "TPE2",
    ALBUM = "TALB",
    ARTIST = "TPE1",
    ATTACHED_PICTURE = "APIC",
    COMMENTS = "COMM",
    COMPOSER = "TCOM",
    CONDUCTOR = "TPE3",
    CONTENT_TYPE = "TCON",
    DATE = "TDAT",
    DISC = "TOPS",
    GROUP_TITLE = "TIT1",
    LYRICIST = "TEXT",
    IS_COMPILATION = "TCMP",
    SUB_TITLE = "TIT3",
    TITLE = "TIT2",
    TRACK = "TRCK",
    YEAR = "TYER",
}
/**
 * Returns the v2.3 equivent for the given v2.2 frame ID.
 */
export declare function fromV2ID(id: string): ID3FrameId | null;
