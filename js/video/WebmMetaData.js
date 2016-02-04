var   VideoStream   = require('../js/video/VideoStream');
const EventEmitter  = require('events');

const eventEmitter = new EventEmitter();

var webmMetaData = null;
var length = 0;
var index = 0;

eventEmitter.on('parsed', function(request) {
  index++;
  if(index >= length) {
    request.socket.emit('webm', webmMetaData);
  }
});

function WebmMetaData(){
  webmMetaData  = null;
  length        = 0;
  index         = 0;
};

//Load the mpd file into memory
WebmMetaData.prototype.mpdToJsonMeta = function(request) {
  if(webmMetaData == null){
    VideoStream.read(request, request.data.path, WebmMetaData._parseMpd, null);
  } else {
    request.socket.emit('webm', webmMetaData);
  }
};

WebmMetaData._parseMpd = function(request, blob) {
  var DOMParser = new DOMParser();
  var mpd = DOMParser.toJson(blob);
  var initSegments = new Map();

  for(var set in mpd.getAllInstances('AdaptionSet')){
    var path = set.getName();
    var initRange = set.getInitRange();
    initSegments.set(path, initRange);
  }

  WebmMetaData._loadSegments(request, initSegments);
};

//Loads the mpd and retreives the InitSegment
WebmMetaData._loadSegments = function(request, initSegments) {
  var readConfigs = [];
  length = 0;

  for(var x = 0; x < initSegments.length; ++x) {
    var readConfig = new Object();
    readConfig.path = initSegments.keyAt(x);
    readConfig.options = {start: parseInt(initSegments[x].start), end: parseInt(initSegments[x].end)};
    readConfig.callback = WebmMetaData._parseMeta;

    readConfigs.add(readConfig);
    length++;
  }

  VideoStream.queuedRead(request, readConfigs, null);
};

WebmMetaData._parseMeta = function(request, blob) {
  var metaObject = new Object();
  var decoder = new ebml.Decoder();

  decoder.on('data', function(segment) {
    WebmMetaData._ebmlToJson(metaObject, segment);
    console.log("we are decoding a segment")
  });

  decoder.on('finish', function(segment) {
    console.log('---------finished decoder');
    decoder.uncork();
    webmMetaData.add(metaObject);
    eventEmitter.emit('parsed', request);
  });

  decoder.cork();
  decoder.write(blob);
  decoder.end();
};

WebmMetaData._ebmlToJson = function(object, data) {
  var json = data.jsonify();
  object.add(json);
};

module.exports = WebmMetaData;
