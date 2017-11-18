function initializeLogin(schemaFactory, keys) {
  $('#login-submit').click(function() {
    var handle	= $('#login-handle').val();
    var token	  = $('#login-token').val();
    var request = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.PAIR, [token, handle]);

    if(request) {
      cookie.set('creds', JSON.stringify(request), cookie.getExpiration(cookie.Enums.EXPIRES.DAY));
      $(document).trigger('initializeConnection', [request]);
    }
  });
}

var loginError = function(message) {
  $(`#login-error`).empty();
  $(`<div class="flex-h  flex-center-v">
    <label>Error:</label>
    <div>${message && message.data ? message.data : message}</div>
    <a href="#" onclick="$($(event.currentTarget).parent()).remove();">
      <span class="icon-min flaticon-error flex-right clear-spacers"></span>
    </a></div>`).appendTo(`#login-error`);
};
