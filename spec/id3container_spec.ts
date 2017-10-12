import {ID3Container} from '../id3container';
import {ID3FrameId} from '../id3frameid';
import {ID3PictureType} from '../id3picturetype';
import * as fs from 'fs';
import * as os from 'os';
import {sep} from 'path';

const tmpDir = os.tmpdir();

describe('ID3Container', function() {
  let testOutput = '';

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
    const test = new ID3Container(`.${sep}test${sep}test_none.mp3`);
    expect(test).toBeTruthy();

    test.onDone((err) => {
      expect(err).toBeUndefined();
      expect(test.getFrameIds().length).toBe(0);
      done();
    });
  });

  it('should load v2.2 tags as written by iTunes', function(done) {
    const test = new ID3Container(`.${sep}test${sep}test_itunes.mp3`);
    expect(test).toBeTruthy();

    test.onDone((err) => {
      expect(err).toBeUndefined();
      let frame = test.getFrame(ID3FrameId.TITLE);
      expect(frame).toBeTruthy();
      expect(frame!.getString())
          .toBe('itunes song');
      frame = test.getFrame(ID3FrameId.ARTIST);
      expect(frame).toBeTruthy();
      expect(frame!.getString())
          .toBe('itunes artist');
      frame = test.getFrame(ID3FrameId.ACCOMPANIMENT);
      expect(frame).toBeTruthy();
      expect(frame!.getString())
          .toBe('itunes album artist');
      frame = test.getFrame(ID3FrameId.COMPOSER);
      expect(frame).toBeTruthy();
      expect(frame!.getString())
         .toBe('itunes composer');
      frame = test.getFrame(ID3FrameId.ALBUM);
      expect(frame).toBeTruthy();
      expect(frame!.getString())
          .toBe('itunes album');
      frame = test.getFrame(ID3FrameId.ALBUM);
      expect(frame).toBeTruthy();
      expect(frame!.getString())
          .toBe('itunes album');
      done();
    });
  });

  it('should write string tags', function(done) {
    const test = new ID3Container(`.${sep}test${sep}test_itunes.mp3`);
    expect(test).toBeTruthy();

    test.onDone((err) => {
      expect(err).toBeUndefined();
      if (err) {
        done();
        return;
      }
      let frame = test.getFrame(ID3FrameId.TITLE);
      expect(frame).toBeTruthy();
      frame!.setString('some new title');
      frame = test.getFrame(ID3FrameId.TITLE);
      expect(frame).toBeTruthy();
      expect(frame!.getString())
          .toBe('some new title');
      done();
    });
  });

  it('should write new tags to a new file', function(done) {
    expect(fs.existsSync(testOutput)).toBeTruthy();
  
    const test = new ID3Container(`.${sep}test${sep}test_itunes.mp3`);
    expect(test).toBeTruthy();

    test.onDone((err) => {
      expect(err).toBeUndefined();
      if (err) {
        done();
        return;
      }
      const newPath = `${testOutput}${sep}test_itunes_rewrite.mp3`;
      const frame = test.getFrame(ID3FrameId.TITLE);
      expect(frame).toBeTruthy();
      frame!.setString('some new title');
      test.write(
          (err) => {
            expect(err).toBeUndefined();
            if (err) {
              done();
              return;
            }
            const rewriteTest = new ID3Container(newPath);
            rewriteTest.onDone((err) => {
              expect(err).toBeUndefined();
              const frame = rewriteTest.getFrame(ID3FrameId.TITLE);
              expect(frame).toBeTruthy();
              expect(frame!.getString())
                  .toBe('some new title');
              fs.unlinkSync(newPath);
              done();
            })
          },
          newPath);
    });
  });
});
