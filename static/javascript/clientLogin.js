function initClientLogin(socket, schemaFactory) {
  $('#submitCreds').click(function() {
    var handle	= $('#loginHandle').val();
    var address	= $('#loginUser').val();
    var token	  = $('#loginToken').val();
    var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.LOGIN, [handle, address, token ? token : undefined]);

    if(typeof request.token !== 'undefined' && request.token.length > 0) {
      socket.request('auth-validate-token', request, true);
    } else {
      socket.request('auth-get-token', request, true);
    }
  });

  $('#btnLogin').click(function() {
    $('#loginModal').modal('show');
    $('#loginModal').on('shown', function() {
      $("#loginUser").focus();
    });
  });
}
