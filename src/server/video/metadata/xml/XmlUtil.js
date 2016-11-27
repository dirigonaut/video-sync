var DOMParser  = require('xmldom').DOMParser;
var XmlFactory = require('./XmlFactory');

var xmlFactory = new XmlFactory();

function XmlUtil() {

};

XmlUtil.prototype.webmMetaToXml = function(meta) {
  var xmlMap = new Map();

  for(var i in meta) {
    var manifest = meta[i];
    var xml = "";

    xml += xmlFactory.buildSegmentList(manifest.timecodeScale, manifest.duration);
    xml += xmlFactory.buildInitialization(manifest.init);

    for(var j in manifest.clusters) {
      xml += xmlFactory.buildSegmentURL([manifest.clusters[j].start,
        manifest.clusters[j].start + manifest.clusters[j].end], [0, 0]);
    }

    xml += xmlFactory.buildSegmentListEnd();

    xmlMap.set(manifest.path, new DOMParser().parseFromString(xml, "text/xml"));
  }

  console.log(xmlMap)
  return xmlMap;
};

module.exports = XmlUtil;
