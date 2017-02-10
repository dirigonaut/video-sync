function guiLog() {
  return function(response) {
    console.log(response);
      $('#logManuscript').append('<p><span class="chat-message" title="' + response.log + '" style="color:blue; font-weight: bold;">' +
    response.time + " " + response.level + ': </span>' + response.message + '</p>'
  )};
}
