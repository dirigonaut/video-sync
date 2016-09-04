var PlayerManager = require('../state/player/PlayerManager');

var playerManager = new PlayerManager();

function ChatEngine() { }

ChatEngine.prototype.broadcast = function(from, message) {

};

ChatEngine.prototype.ping = function(from, to, message) {

};

module.export = ChatEngine;
