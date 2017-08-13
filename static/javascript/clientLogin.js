function initClientLogin(socket, schemaFactory, keys) {
  $('#submitCreds').click(function() {
    var handle	= $('#loginHandle').val();
    var address	= $('#loginUser').val();
    var token	  = $('#loginToken').val();
    var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.LOGIN, [handle, address, token ? token : undefined]);

    if(typeof request.token !== 'undefined' && request.token.trim().length > 0) {
      socket.request(keys.AUTHTOKEN, request, true);
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
}
