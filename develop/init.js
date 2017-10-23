const browserify  = require('browserify');
const path        = require('path');
const marked      = require('marked');
const fs          = require('fs');

process.on('uncaughtException', function(err) {
  console.error(err);
  process.exit(1);
});

var b = browserify({
  entries: [path.join(__dirname, '../src/client/factory/ClientFactoryManager.js')],
  standalone: 'FactoryManager',
  cache: {}
});

b.bundle().pipe(fs.createWriteStream(path.join(__dirname, '../static/resources/bundle.js')));

var readMe = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf-8');
var markdownReadMe = marked(readMe);

fs.writeFileSync(path.join(__dirname,'../static/html/info/documentation.html'), markdownReadMe);
