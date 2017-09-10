const Bundler = require('./Bundler');
const path    = require('path');
const marked  = require('marked');
const fs      = require('fs');

new Bundler();

var readMe = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf-8');
var markdownReadMe = marked(readMe);

fs.writeFileSync(path.join(__dirname,'../static/html/info/documentation.html'), markdownReadMe);
