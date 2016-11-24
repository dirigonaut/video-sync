var mp4File = './media/audio.m4s';
var metaFile = './';

var fs = require('fs');
var isoBmff = require('../index.js');

var readStream = fs.createReadStream(mp4File, {
    flags: 'r',
    encoding: null,
    fd: null,
    mode: 0666,
    autoClose: true
});

var writeStream = fs.createWriteStream(metaFile, { autoClose: true });

var unboxing = new isoBmff.Parser(function (err, data) {
    writeStream.write(data);
});


readStream.pipe(unboxing);
