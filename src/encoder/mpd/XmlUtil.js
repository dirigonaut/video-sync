const DOMParser  = require("xmldom").DOMParser;

var xmlFactory, log;

function XmlUtil() { }

XmlUtil.prototype.initialize = function() {
	if(typeof XmlUtil.prototype.protoInit === "undefined") {
    XmlUtil.prototype.protoInit = true;
		xmlFactory 			= this.factory.createXmlFactory();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
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
