const should = require('should');
const Path   = require('path');

const FfprobeProcess = require('../../../../../../src/server/video/encoding/process/FfprobeProcess');

describe('FfprobeProcess', function() {
  describe('#process()', function() {
    it('should return the details of a video codec', function() {
      var ffprobeProcess = new FfprobeProcess();
      var command = ['-v', 'error', '-show_format', '-show_streams', Path.join(__dirname, '../../../../../../static/media/bunny.mov')];
      return ffprobeProcess.process(command).then(function(data) {
        data.should.be.Object();
        data.should.have.property('stream');
        data.stream.should.have.length(2);
        data.should.have.property('format');
        data.format.should.have.length(1);
      });
    });
  });
});
