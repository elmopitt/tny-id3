"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * An enumeration of known ID3 field IDs.
 */
var ID3FrameId;
(function (ID3FrameId) {
    ID3FrameId["ACCOMPANIMENT"] = "TPE2";
    ID3FrameId["ALBUM"] = "TALB";
    ID3FrameId["ARTIST"] = "TPE1";
    ID3FrameId["ATTACHED_PICTURE"] = "APIC";
    ID3FrameId["COMMENTS"] = "COMM";
    ID3FrameId["COMPOSER"] = "TCOM";
    ID3FrameId["CONDUCTOR"] = "TPE3";
    ID3FrameId["CONTENT_TYPE"] = "TCON";
    ID3FrameId["DATE"] = "TDAT";
    ID3FrameId["DISC"] = "TOPS";
    ID3FrameId["GROUP_TITLE"] = "TIT1";
    ID3FrameId["LYRICIST"] = "TEXT";
    ID3FrameId["IS_COMPILATION"] = "TCMP";
    ID3FrameId["SUB_TITLE"] = "TIT3";
    ID3FrameId["TITLE"] = "TIT2";
    ID3FrameId["TRACK"] = "TRCK";
    ID3FrameId["YEAR"] = "TYER";
})(ID3FrameId = exports.ID3FrameId || (exports.ID3FrameId = {}));
/**
 * Returns the v2.3 equivent for the given v2.2 frame ID.
 */
function fromV2ID(id) {
    switch (id) {
        case 'TT1': return ID3FrameId.GROUP_TITLE;
        case 'TT2': return ID3FrameId.TITLE;
        case 'TT3': return ID3FrameId.SUB_TITLE;
        case 'TP1': return ID3FrameId.ARTIST;
        case 'TP2': return ID3FrameId.ACCOMPANIMENT;
        case 'TP3': return ID3FrameId.CONDUCTOR;
        case 'TCM': return ID3FrameId.COMPOSER;
        case 'TXT': return ID3FrameId.LYRICIST;
        case 'TCO': return ID3FrameId.CONTENT_TYPE;
        case 'TAL': return ID3FrameId.ALBUM;
        case 'TRK': return ID3FrameId.TRACK;
        case 'TPA': return ID3FrameId.DISC;
        case 'TYE': return ID3FrameId.YEAR;
        case 'TDA': return ID3FrameId.DATE;
        case 'COM': return ID3FrameId.COMMENTS;
        case 'TCP': return ID3FrameId.IS_COMPILATION;
        case 'TST': return ID3FrameId.TITLE;
        case 'TSA': return ID3FrameId.ALBUM;
        case 'TSP': return ID3FrameId.ARTIST;
        case 'TS2': return ID3FrameId.ACCOMPANIMENT;
        case 'TSC': return ID3FrameId.COMPOSER;
        case 'PIC': return ID3FrameId.ATTACHED_PICTURE;
        default: return null;
    }
}
exports.fromV2ID = fromV2ID;
//# sourceMappingURL=id3frameid.js.map