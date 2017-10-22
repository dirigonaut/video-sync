function initClientLogin(socket, schemaFactory, keys) {
  $('#submitCreds').click(function() {
    var handle	= $('#loginHandle').val();
    var token	  = $('#loginToken').val();
    var request = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.PAIR, [token, handle]);

    if(request) {
      cookie.setCookie('creds', JSON.stringify(request), cookie.getExpiration(cookie.Enums.EXPIRES.DAY));
      $(document).trigger('initializeConnection');
    }
  });

  $('#btnLogin').click(function() {
    $('#loginModal').modal('show');
    $('#loginModal').on('shown', function() {
      $("#loginUser").focus();
    });
  });

  var creds = cookie.getCookie('creds');
  if(creds && creds[1]) {
    creds = JSON.parse(creds[1]);
    $('#loginHandle').val(creds.handle);
    $('#loginToken').val(creds.token);
  }
}
