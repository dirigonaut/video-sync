function guiLog() {
  return function(message) {
    $('#logManuscript').append(`<p><span class="chat-message" title="${message.log}" style="color:blue; font-weight: bold;">
      ${message.time} ${message.level}: </span>${message.message} ${message.meta}</p>`);
  }
}
