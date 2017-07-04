const DOMParser  = require('xmldom').DOMParser;
const XmlFactory = require('./XmlFactory');

var xmlFactory, log;

function XmlUtil() { }

XmlUtil.prototype.initialize = function(force) {
	if(typeof XmlUtil.prototype.protoInit === 'undefined') {
    XmlUtil.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ENCODING);
  }

  if(force === undefined ? typeof XmlUtil.prototype.stateInit === 'undefined' : force) {
    XmlUtil.prototype.stateInit = true;
    xmlFactory = this.factory.createXmlFactory();
  }
};

XmlUtil.prototype.webmMetaToXml = function(meta) {
  log.debug("XmlUtil.webmMetaToXml", meta);
  var xmlMap = new Map();

  for(var i in meta) {
    var manifest = meta[i];
    var xml = "";

    xml += xmlFactory.buildSegmentList(manifest.timecodeScale, manifest.duration);
    xml += xmlFactory.buildInitialization(manifest.init);

    for(var j in manifest.clusters) {
      xml += xmlFactory.buildSegmentURL([manifest.clusters[j].start,
         manifest.clusters[j].end], manifest.clusters[j].time);
    }

    xml += xmlFactory.buildSegmentListEnd();
    xmlMap.set(manifest.path, new DOMParser().parseFromString(xml, "text/xml"));
  }

  return xmlMap;
};

module.exports = XmlUtil;
