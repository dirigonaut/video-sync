$(window).load(function(){
  function chooseFile(name) {
    var chooser = $(name);
    chooser.change(function(evt) {
      console.log($(this).val());
      $('#shared_video').attr({
        "src": $(this).val(),
        "autoplay": "autoplay",
      });
    });
  }
  chooseFile('#fileDialog');

  var isStarted = server_start();

  if (isStarted)
  {
    $.get("http://localhost:8080/static/html/client.html",function(data){
      $("#client-container").append(data);
    });
  }
});
