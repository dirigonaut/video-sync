function initClientLogin(schemaFactory, keys) {
  $('#login-submit').click(function() {
    var handle	= $('#login-handle').val();
    var token	  = $('#login-token').val();
    var request = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.PAIR, [token, handle]);

    if(request) {
      cookie.setCookie('creds', JSON.stringify(request), cookie.getExpiration(cookie.Enums.EXPIRES.DAY));
      $(document).trigger('initializeConnection', [request]);
    }
  });
}
