function initClientLogin(socket, schemaFactory, keys) {
  $('#submitCreds').click(function() {
    var handle	= $('#loginHandle').val();
    var address	= $('#loginUser').val();
    var token	  = $('#loginToken').val();
    var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.LOGIN, [handle, address, token ? token : undefined]);

    if(typeof request.token !== 'undefined' && request.token.trim().length > 0) {
      socket.request(keys.AUTHTOKEN, request, true);
      populateCookie('creds', JSON.stringify(request));
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

  function populateCookie(key, value) {
    var expire = new Date();
    expire.setHours(expire.getHours() + 24);
    document.cookie = `${key}=${value}; expires=${expire}`;
  }

  function getCookie(name) {
    var match = document.cookie.match(RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? match[1] : undefined;
  }

  return function() {
    var creds = getCookie('creds');
    if(creds) {
      creds = JSON.parse(creds);
      $('#loginHandle').val(creds.handle);
      $('#loginUser').val(creds.address);
      $('#loginToken').val(creds.token);

      socket.request(keys.AUTHTOKEN, creds, true);
    }
  }
}
