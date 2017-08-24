function initClientLogin(socket, schemaFactory, keys) {
  $('#submitCreds').click(function() {
    var handle	= $('#loginHandle').val();
    var address	= $('#loginUser').val();
    var token	  = $('#loginToken').val();
    var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.LOGIN, [handle, address, token ? token : undefined]);

    if(typeof request.token !== 'undefined' && request.token.trim().length > 0) {
      socket.request(keys.AUTHTOKEN, request, true);
      cookie.setCookie('creds', JSON.stringify(request), cookie.getExpiration(cookie.ExpireEnum.DAY));
    } else {
      socket.request(keys.GETTOKEN, request, true);
    }
  });

  $('#btnLogin').click(function() {
    $('#loginModal').modal('show');
    $('#loginModal').on('shown', function() {
      $("#loginUser").focus();
    });
  });

  return function() {
    var creds = cookie.getCookie('creds');
    if(creds) {
      creds = JSON.parse(creds[1]);
      $('#loginHandle').val(creds.handle);
      $('#loginUser').val(creds.address);
      $('#loginToken').val(creds.token);

      socket.request(keys.AUTHTOKEN, creds, true);
    }
  }
}
