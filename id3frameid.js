'use strict';

/**
 * An enumeration of known ID3 field IDs.
 * @enum {string}
 */
const ID3FrameId = {
  ACCOMPANIMENT: 'TPE2',
  ALBUM: 'TALB',
  ARTIST: 'TPE1',
  ATTACHED_PICTURE: 'APIC',
  COMMENTS: 'COMM',
  COMPOSER: 'TCOM',
  CONDUCTOR: 'TPE3',
  CONTENT_TYPE: 'TCON',
  DATE: 'TDAT',
  DISC: 'TOPS',
  GROUP_TITLE: 'TIT1',
  LYRICIST: 'TEXT',
  IS_COMPILATION: 'TCMP',
  SUB_TITLE: 'TIT3',
  TITLE: 'TIT2',
  TRACK: 'TRCK',
  YEAR: 'TYER',
};

const fromV2ID = function(id) {
  switch(id) {
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

module.exports = ID3FrameId;
module.exports.fromV2ID = fromV2ID;
