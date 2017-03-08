function initClientLogin() {
  $('#submitCreds').click(function readContacts() {
    var request = {};
    request.handle	= $('#loginHandle').val();
    request.address	= $('#loginUser').val();
    request.token	= $('#loginToken').val();

    if(request.token.length > 0) {
      clientSocket.sendRequest('auth-validate-token', request);
    } else {
      clientSocket.sendRequest('auth-get-token', request);
    }
  });

  $('#btnLogin').click(function() {
    $('#loginModal').modal('show');
    $('#loginModal').on('shown', function() {
      $("#loginUser").focus();
    });
  });
}
