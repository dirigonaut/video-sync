function guiLog() {
  return function(message) {
    $('#logManuscript').append(`<p><span class="chat-message" title="${message.label}" style="color:blue; font-weight: bold;">
      ${message.time} ${message.level}: </span>${message.text} ${typeof message.meta !== 'undefined' ? message.meta : ''}</p>`);
  }
}
