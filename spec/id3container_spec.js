const ID3Container = require('../id3container.js');
const ID3FrameID = require('../id3frameid.js');
const ID3PictureType = require('../id3picturetype.js');
const fs = require('fs');
const os = require('os');
const { sep } = require('path');

const tmpDir = os.tmpdir();

describe('ID3Container', function() {
  let testOutput;

  beforeEach(() => {
    // Create a temporary directory for writing.
    testOutput = fs.mkdtempSync(`${tmpDir}${sep}tny-id3-`);
  });
  afterEach(() => {
    // Remove the temporary directory for written files. If it's not empty,
    // then something went wrong.
    fs.rmdirSync(testOutput);
  });

  it('should load a file with no existing tags', function(done) {
    var test = new ID3Container(`.${sep}test${sep}test_none.mp3`);
    expect(test).not.toBe(null);

    test.onDone((err) => {
      expect(err).toBe(null);
      expect(test.getFrameIds().length).toBe(0);
      done();
    });
  });

  it('should load v2.2 tags as written by iTunes', function(done) {
    var test = new ID3Container(`.${sep}test${sep}test_itunes.mp3`);
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
      expect(test.getFrame(ID3FrameID.ALBUM).getString())
          .toBe('itunes album');
      done();
    });
  });

  it('should write string tags', function(done) {
    var test = new ID3Container(`.${sep}test${sep}test_itunes.mp3`);
    expect(test).not.toBe(null);

    test.onDone((err) => {
      expect(err).toBe(null);
      if (err) {
        done();
        return;
      }
      test.getFrame(ID3FrameID.TITLE).setString('some new title');
      expect(test.getFrame(ID3FrameID.TITLE).getString())
          .toBe('some new title');
      done();
    });
  });

  it('should write new tags to a new file', function(done) {
    expect(fs.existsSync(testOutput)).toBeTruthy();
  
    var test = new ID3Container(`.${sep}test${sep}test_itunes.mp3`);
    expect(test).not.toBe(null);

    test.onDone((err) => {
      expect(err).toBe(null);
      if (err) {
        done();
        return;
      }
      const newPath = `${testOutput}${sep}test_itunes_rewrite.mp3`;
      test.getFrame(ID3FrameID.TITLE).setString('some new title');
      test.write(
          (err) => {
            expect(err).toBe(null);
            if (err) {
              done();
              return;
            }
            var rewriteTest = new ID3Container(newPath);
            rewriteTest.onDone((err) => {
              expect(err).toBe(null);
              expect(rewriteTest.getFrame(ID3FrameID.TITLE).getString())
                  .toBe('some new title');
              fs.unlinkSync(newPath);
              done();
            })
          },
          newPath);
    });
  });
});
