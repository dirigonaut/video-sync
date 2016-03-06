function FileBuffer () {
    this.buffer = [];
};

FileBuffer.prototype.pushData = function(data) {
  this.buffer.push(data);
};

FileBuffer.prototype.getBuffer = function () {
    return Buffer.concat(this.buffer);
};

FileBuffer.prototype.clearBuffer = function () {
    this.buffer = [];
};

module.exports = FileBuffer;
