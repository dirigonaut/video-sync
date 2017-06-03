const should = require('should');
const Path   = require('path');

const Ffprobe = require('../../../../../../src/server/video/encoding/process/FfprobeProcess');

describe('Ffprobe', function() {
  describe('#process()', function() {
    it('should return the details of a video codec', function() {
      var ffprobe = new Ffprobe();
      var command = ['-v', 'error', '-show_format', '-show_streams', Path.join(__dirname, '../../../../../../static/media/bunny.mov')];
      return ffprobe.process(command).should.be.finally.String();
    });
  });
});
