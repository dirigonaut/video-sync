var browserify      = require('browserify');
var watchify        = require('watchify');
var fs              = require('fs');

var b = browserify({
  entries: ['src/client/Client.js'],
  standalone: 'Client',
  cache: {},
  packageCache: {},
  //plugin: [watchify]
});

function Bundler() {
  //b.on('update', bundle);
  bundle();
}

function bundle() {
  b.bundle().pipe(fs.createWriteStream('static/resources/bundle.js'));
}

module.exports = Bundler;
