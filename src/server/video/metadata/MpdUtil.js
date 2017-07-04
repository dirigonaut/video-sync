const Promise   = require('bluebird');
const XmlDom    = require('xmldom');
const Fs        = Promise.promisifyAll(require('fs'));

var fileSystemUtils, log;

function MpdUtil() { }

MpdUtil.prototype.initialize = function(force) {
	if(typeof MpdUtil.prototype.protoInit === 'undefined') {
    MpdUtil.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ENCODING);
  }

  if(force === undefined ? typeof MpdUtil.prototype.stateInit === 'undefined' : force) {
    MpdUtil.prototype.stateInit = true;
    fileSystemUtils = this.factory.createFileSystemUtils();
  }
};

MpdUtil.prototype.addSegmentsToMpd = Promise.coroutine(function* (path, metaMap) {
  log.debug('MpdUtil.addSegmentsToMpd', metaMap);
  var rawMpd = yield Fs.readFileAsync(path);

  if(!rawMpd) {
    throw new Error(`Mpd could not be loaded from path ${path}`);
  }

  var DomParser = XmlDom.DOMParser;
  var mpd = new DomParser().parseFromString(rawMpd.toString(), "text/xml");

  cleanMpdPaths(mpd);
  insertMetaData(mpd, metaMap);

  var XMLSerializer = XmlDom.XMLSerializer;
  var text = new XMLSerializer().serializeToString(mpd);

  return Fs.writeFileAsync(path, text);
});

module.exports = MpdUtil;

var insertMetaData = function(mpd, metaData) {
  log.debug("MpdUtil.insertMetaData", metaData);
  var adaptionSets = mpd.documentElement.getElementsByTagName('AdaptationSet');
  var representationMap = new Map();

  for(var i = 0; i < adaptionSets.length; ++i) {
    var representationSets = adaptionSets[i].getElementsByTagName('Representation');

    for(var j = 0; j < representationSets.length; ++j) {
      var id = representationSets.item(j).getElementsByTagName('BaseURL').item(0).childNodes.item(0).data;
      var base = representationSets.item(j).getElementsByTagName('SegmentBase').item(0);

      if(base) {
        representationSets.item(j).removeChild(base);
      }

      representationMap.set(id, representationSets.item(j));
    }
  }

  for(var key of metaData.keys()) {
	  var strippedKey = `${fileSystemUtils.splitNameFromPath(key)}.${fileSystemUtils.splitExtensionFromPath(key)}`;
    var meta = representationMap.get(strippedKey);
    if(meta) {
      meta.appendChild(metaData.get(key));
    }
  }
};

var cleanMpdPaths = function(mpd) {
  log.debug('MpdUtil.cleanMpdPaths');
  var adaptionSets = mpd.documentElement.getElementsByTagName('AdaptationSet');
  var representationMap = new Map();

  for(var i = 0; i < adaptionSets.length; ++i) {
    var representationSets = adaptionSets[i].getElementsByTagName('Representation');

    for(var j = 0; j < representationSets.length; ++j) {
      var baseUrlData = representationSets.item(j).getElementsByTagName('BaseURL').item(0).childNodes.item(0)
      var name = `${fileSystemUtils.splitNameFromPath(baseUrlData.data)}.${fileSystemUtils.splitExtensionFromPath(baseUrlData.data)}`;
      baseUrlData.data = name;
      baseUrlData.nodeValue = name;
    }
  }
};
