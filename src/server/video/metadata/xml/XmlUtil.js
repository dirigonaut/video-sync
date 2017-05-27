var DOMParser  = require('xmldom').DOMParser;
var XmlFactory = require('./XmlFactory');
var LogManager = require('../../../log/LogManager');

var log = LogManager.getLog(LogManager.LogEnum.ENCODING);
var xmlFactory;

class XmlUtil {
  constructor() {
    if(typeof XmlUtil.prototype.lazyInit === 'undefined') {
      xmlFactory = new XmlFactory();
      XmlUtil.prototype.lazyInit = true;
    }
  }
}

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
