const browserify      = require('browserify');
const watchify        = require('watchify');
const fs              = require('fs');
const path            = require('path');

process.on('uncaughtException', function(err) {
  console.error(err);
  process.exit(1);
});

var b = browserify({
  entries: [path.join(__dirname, '../src/client/Client.js')],
  standalone: 'Client',
  cache: {},
  packageCache: {}
});

function Bundler() {
  b.on('update', bundle);
  bundle();
}

function bundle() {
  b.bundle().pipe(fs.createWriteStream(path.join(__dirname, '../static/resources/bundle.js')));
}

module.exports = Bundler;
