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
});
