function testSendChatCommand(command) {
  var message = {"command" : command, "issuer" : client.getClientSocket().getSocketId(), "param" : null};
  client.getClientSocket().sendRequest("chat-command", message);
}

function testSendChat() {
  client.getClientSocket().sendRequest("chat-broadcast", "broadcast");
}

function testSendPrivateChat(id) {
  client.getClientSocket().sendRequest("chat-private", {"to": id, "text": "ping"});
}

client.getClientSocket().setEvent("chat-broadcast-resp", function(data) { console.log(data)});
client.getClientSocket().setEvent("chat-ping-resp", function(data) { console.log(data)});
client.getClientSocket().setEvent("chat-log-resp", function(data) { console.log(data)});
