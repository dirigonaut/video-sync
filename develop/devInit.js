var Bundler = require('./Bundler');
new Bundler();

var marked = require('marked');
var fs = require('fs');

var readMe = fs.readFileSync('README.md', 'utf-8');
var markdownReadMe = marked(readMe);

fs.writeFileSync('../static/html/info/README.html', markdownReadMe);
