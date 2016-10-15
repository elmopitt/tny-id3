'use strict';

const ID3Container = require('./id3container.js');
const ID3Frame = require('./id3frame.js');
const ID3FrameId = require('./id3frameid.js');

console.log('tny-id3');
try {
  const test = new ID3Container('./test/oingo.mp3');
  test.onDone((err) => {
    if (err) {
      console.error(err);
    } else {
      // console.log('test container:');
      // console.log(test);
      const albumFrame = test.getFrame(ID3FrameId.ALBUM);
      console.log('Album: ' + albumFrame ? albumFrame.getString() : null);
      albumFrame.setString('héll yøah');
    }
  })
} catch (err) {
  console.error('error creating ID3 container:');
  console.error(err);
}

module.exports.ID3Container = ID3Container;
module.exports.ID3Frame = ID3Frame;
