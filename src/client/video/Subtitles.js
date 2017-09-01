const Promise = require('bluebird');

var VVTCue, eventKeys, schemaFactory, log;

function Subtitles() { }

Subtitles.prototype.initialize = function(force) {
  if(typeof Subtitles.prototype.protoInit === 'undefined') {
    Subtitles.prototype.protoInit = true;

    var logManager = this.factory.createClientLogManager();
    log = logManager.getLog(logManager.LogEnum.VIDEO);

    eventKeys       = this.factory.createKeys();
    schemaFactory   = this.factory.createSchemaFactory();
  }
};

Subtitles.prototype.setup = function(videoElement, document, vttCue) {
  log.debug('Subtitles.setup');
  VVTCue = vttCue;

  var onLoad = Promise.coroutine(function*() {
    yield onReady.call(this, videoElement, document, vttCue);
  }.bind(this));

  video.addEventListener("loadedmetadata", onLoad);

  return new Promise.resolve(function() {
    videoElement.removeEventListener('loadedmetadata', onLoad);
  });
};

module.exports = Subtitles;

var onReady = Promise.coroutine(function* (videoElement, document) {
  log.debug('Subtitles._onReady');
  var fileBuffer = this.factory.createFileBuffer();
  var files = yield fileBuffer.requestFilesAsync(eventKeys.SUBTITLES);

  if(files) {
    for(var i = 0; i < files.length; ++i) {
      initTrack(i, videoElement, document, files[i]);
    }
  }
});

var initTrack = function(index, videoElement, document, file) {
 var track = videoElement.addTextTrack('subtitles', 'English', 'en');
 track.mode = "showing";

 addCues(track, file[1].toString());
};

var addCues = function(track, file) {
  var cues = createCues(file);

  for(var i = 0; i < cues.length; ++i) {
    track.addCue(new VVTCue(cues[i].range.start, cues[i].range.end, cues[i].text));
  }
};

var createCues = function(file) {
  var regex = /\d+:\d+.\d+\s-->\s\d+:\d+.\d+|(?=<b>)[\S\s]+?(?=<\/b>)/gm;
  var results = [];

  for(var itter = regex.exec(file), index = 0; itter; itter = regex.exec(file)) {
    var value = itter[0];

    if(!results[Math.floor(index)]) {
      results[Math.floor(index)] = ({range: '', text: ''});
    }

    if(value && value.includes('-->')) {
      var splitTime = value.split('-->');
      results[Math.floor(index)].range = {start: convertToSeconds(splitTime[0]), end: convertToSeconds(splitTime[1])};
    } else {
      results[Math.floor(index)].text = value.substring(3);
    }

    index+=.5;
  }

  return results;
};

var convertToSeconds = function(input) {
  var results = 0;
  var splitInput = input.split(":");

  for(var i = 0; i < splitInput.length; ++i) {
    results += splitInput[i] * Math.pow(60, (splitInput.length - (i + 1)));
  }

  return results;
};
