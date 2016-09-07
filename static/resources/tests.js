function testSendChatCommand(command) {
  var mesage = {"command" : command, "issuer" : client.getClientSocket().getSocketId(), "param" : null};
  client.getClientSocket().sendRequest("chat-command", message);
}

function testSendChat(text) {
  client.getClientSocket().sendRequest("chat-command", text);
}
