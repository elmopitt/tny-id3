"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const id3container_1 = require("../id3container");
const id3frameid_1 = require("../id3frameid");
const fs = require("fs");
const os = require("os");
const path_1 = require("path");
const tmpDir = os.tmpdir();
describe('ID3Container', function () {
    let testOutput = '';
    beforeEach(() => {
        // Create a temporary directory for writing.
        testOutput = fs.mkdtempSync(`${tmpDir}${path_1.sep}tny-id3-`);
    });
    afterEach(() => {
        // Remove the temporary directory for written files. If it's not empty,
        // then something went wrong.
        fs.rmdirSync(testOutput);
    });
    it('should load a file with no existing tags', function (done) {
        const test = new id3container_1.ID3Container(`.${path_1.sep}test${path_1.sep}test_none.mp3`);
        expect(test).toBeTruthy();
        test.onDone((err) => {
            expect(err).toBeUndefined();
            expect(test.getFrameIds().length).toBe(0);
            done();
        });
    });
    it('should load v2.2 tags as written by iTunes', function (done) {
        const test = new id3container_1.ID3Container(`.${path_1.sep}test${path_1.sep}test_itunes.mp3`);
        expect(test).toBeTruthy();
        test.onDone((err) => {
            expect(err).toBeUndefined();
            let frame = test.getFrame(id3frameid_1.ID3FrameId.TITLE);
            expect(frame).toBeTruthy();
            expect(frame.getString())
                .toBe('itunes song');
            frame = test.getFrame(id3frameid_1.ID3FrameId.ARTIST);
            expect(frame).toBeTruthy();
            expect(frame.getString())
                .toBe('itunes artist');
            frame = test.getFrame(id3frameid_1.ID3FrameId.ACCOMPANIMENT);
            expect(frame).toBeTruthy();
            expect(frame.getString())
                .toBe('itunes album artist');
            frame = test.getFrame(id3frameid_1.ID3FrameId.COMPOSER);
            expect(frame).toBeTruthy();
            expect(frame.getString())
                .toBe('itunes composer');
            frame = test.getFrame(id3frameid_1.ID3FrameId.ALBUM);
            expect(frame).toBeTruthy();
            expect(frame.getString())
                .toBe('itunes album');
            frame = test.getFrame(id3frameid_1.ID3FrameId.ALBUM);
            expect(frame).toBeTruthy();
            expect(frame.getString())
                .toBe('itunes album');
            done();
        });
    });
    it('should write string tags', function (done) {
        const test = new id3container_1.ID3Container(`.${path_1.sep}test${path_1.sep}test_itunes.mp3`);
        expect(test).toBeTruthy();
        test.onDone((err) => {
            expect(err).toBeUndefined();
            if (err) {
                done();
                return;
            }
            let frame = test.getFrame(id3frameid_1.ID3FrameId.TITLE);
            expect(frame).toBeTruthy();
            frame.setString('some new title');
            frame = test.getFrame(id3frameid_1.ID3FrameId.TITLE);
            expect(frame).toBeTruthy();
            expect(frame.getString())
                .toBe('some new title');
            done();
        });
    });
    it('should write new tags to a new file', function (done) {
        expect(fs.existsSync(testOutput)).toBeTruthy();
        const test = new id3container_1.ID3Container(`.${path_1.sep}test${path_1.sep}test_itunes.mp3`);
        expect(test).toBeTruthy();
        test.onDone((err) => {
            expect(err).toBeUndefined();
            if (err) {
                done();
                return;
            }
            const newPath = `${testOutput}${path_1.sep}test_itunes_rewrite.mp3`;
            const frame = test.getFrame(id3frameid_1.ID3FrameId.TITLE);
            expect(frame).toBeTruthy();
            frame.setString('some new title');
            test.write((err) => {
                expect(err).toBeUndefined();
                if (err) {
                    done();
                    return;
                }
                const rewriteTest = new id3container_1.ID3Container(newPath);
                rewriteTest.onDone((err) => {
                    expect(err).toBeUndefined();
                    const frame = rewriteTest.getFrame(id3frameid_1.ID3FrameId.TITLE);
                    expect(frame).toBeTruthy();
                    expect(frame.getString())
                        .toBe('some new title');
                    fs.unlinkSync(newPath);
                    done();
                });
            }, newPath);
        });
    });
});
//# sourceMappingURL=id3container_spec.js.map