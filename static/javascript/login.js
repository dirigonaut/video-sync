function initClientLogin(schemaFactory, keys) {
  $('#submitCreds').click(function() {
    var handle	= $('#loginHandle').val();
    var token	  = $('#loginToken').val();
    var request = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.PAIR, [token, handle]);

    if(request) {
      cookie.setCookie('creds', JSON.stringify(request), cookie.getExpiration(cookie.Enums.EXPIRES.DAY));
      $(document).trigger('initializeConnection', [request]);
    }
  });

  $('#btnLogin').click(function() {
    $('#loginModal').modal('show');
    $('#loginModal').on('shown', function() {
      $("#loginUser").focus();
    });
  });
}
