const Promise = require('bluebird');
const Events  = require('events');

var eventKeys, log;

function Subtitles() { }

Subtitles.prototype.initialize = function(force) {
  if(typeof Subtitles.prototype.protoInit === 'undefined') {
    Subtitles.prototype.protoInit = true;
    Object.setPrototypeOf(Subtitles.prototype, Events.prototype);

    eventKeys      = this.factory.createKeys();
    var logManager = this.factory.createClientLogManager();
    log = logManager.getLog(logManager.Enums.LOGS.VIDEO);
  }
};

Subtitles.prototype.setup = function(videoElement) {
  log.debug('Subtitles.setup');
  var onLoad = Promise.coroutine(function*() {
    yield onReady.call(this, videoElement);
  }.bind(this));

  video.addEventListener("loadedmetadata", onLoad);

  return new Promise.resolve(onReset(videoElement, onLoad));
};

module.exports = Subtitles;

var onReady = Promise.coroutine(function* (videoElement) {
  log.debug('Subtitles._onReady');
  var fileBuffer = this.factory.createFileBuffer();
  var files = yield fileBuffer.requestFilesAsync(eventKeys.SUBTITLES);

  if(files) {
    for(var i = 0; i < files.length; ++i) {
      initTrack(videoElement, files[i][0].type, files[i][1].toString());
    }
  }

  this.emit('subtitle-loaded');
});

var onReset = function(videoElement, onLoad) {
  var reset = function() {
    log.debug('Subtitles._onReset');
    for(var i = 0; i < videoElement.textTracks.length; ++i) {
      var track = videoElement.textTracks[i];
      var cues = videoElement.textTracks[i].cues;
      track.mode = "disabled";

      while(cues && cues.length > 0) {
        track.removeCue(cues[0]);
      }
    }

    videoElement.removeEventListener('loadedmetadata', onLoad);
  };

  return reset;
}

var initTrack = function(videoElement, name, file) {
  var track;

  if(videoElement.textTracks.length > 0) {
    for(let i = 0; i < videoElement.textTracks.length; ++i) {
      if(videoElement.textTracks[i].mode === 'disabled') {
        track = videoElement.textTracks[i];
        track.label = name;
        track.mode = "hidden";
      }
    }
  } else {
    track = videoElement.addTextTrack('subtitles', name, 'en');
    track.mode = "hidden";
  }

  if(track) {
    var rawCues = createCues(file);
    for(var i = 0; i < rawCues.length; ++i) {
      track.addCue(new VTTCue(rawCues[i].range.start, rawCues[i].range.end, rawCues[i].text));
    }
  }
};

var createCues = function(file) {
  var regex = /[\d+:]*\d+.\d+\s-->\s[\d+:]*\d+.\d+/g;
  var cueBlocks = file.split('\n\n');
  var results = [];

  for(var i = 0; i < cueBlocks.length; ++i) {
    var block = cueBlocks[i];
    var cueData = { };

    if(block) {
      var value = block.match(regex);
      if(value) {
        var splitTime = value[0].split('-->');
        cueData.range = {start: convertToSeconds(splitTime[0]), end: convertToSeconds(splitTime[1])};
        cueData.text = block.substring(block.indexOf('\n')).trim();
      }
    }

    if(cueData.range && cueData.text) {
      results.push(cueData);
    }
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
