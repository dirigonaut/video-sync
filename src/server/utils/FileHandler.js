var static = require('node-static');

var file_server = new static.Server('',{
    cache: 0,
    gzip: true
});

function FileHandler() {

}

FileHandler.prototype.handler = function() {
  return function(req, res) {
      console.log(req);
      req.addListener('end', function() {
        file_server.serve( req, res );
    }).resume();
}

module.exports = FileHandler;
