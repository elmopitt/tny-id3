const ID3Container = require('../id3container.js');
const ID3FrameID = require('../id3frameid.js');

describe('ID3Container', function() {
  it('should load a file with no existing tags', function(done) {
    var test = new ID3Container('./test/test_none.mp3');
    expect(test).not.toBe(null);

    test.onDone((err) => {
      expect(err).toBe(null);
      expect(test.getFrameIds().length).toBe(0);
      done();
    });
  });

  it('should load v2.2 tags as written by iTunes', function(done) {
    var test = new ID3Container('./test/test_itunes.mp3');
    expect(test).not.toBe(null);

    test.onDone((err) => {
      expect(err).toBe(null);
      expect(test.getFrame(ID3FrameID.TITLE).getString())
          .toBe('itunes song');
      expect(test.getFrame(ID3FrameID.ARTIST).getString())
          .toBe('itunes artist');
      expect(test.getFrame(ID3FrameID.ACCOMPANIMENT).getString())
          .toBe('itunes album artist');
      expect(test.getFrame(ID3FrameID.COMPOSER).getString())
          .toBe('itunes composer');
      expect(test.getFrame(ID3FrameID.ALBUM).getString())
          .toBe('itunes album');
      done();
    });
  });
});
