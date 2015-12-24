var spawn = require('child_process').spawn,
    split = require('split'),
    EventEmiter = require('events').EventEmitter;

function EncoderWrapper(options) {
    var self = {};
    self.options = options || "";
    self.properties = {};

    self._construct_options = function(){
      var args = [];
      var options = self.options.split(" -");
      var lastIndex = options.length-1;

      var keyless = self._getTailKeylessValues(options[lastIndex]);
      options[lastIndex] = options[lastIndex].substr(0, options[lastIndex].length - keyless.length-1);

      options.forEach(function(item){
        args = args.concat(self._getKeyValuePair(item.split(" ")));
      });

      args = args.concat(keyless.split(" "));

      console.log(args);
      return args;
    }

    self._getKeyValuePair = function(command) {
      var keyValuePair = [];
      var key = command.shift().trim();
      var value = "";

      if(key != ""){
        key = "-" + key;
        if(command.length > 1){
            value += command[1];
        } else {
          value = command.toString() || null;
        }

        keyValuePair.push(key);

        if(value != null){
          keyValuePair.push(value);
        }
      }

      return keyValuePair;
    }

    self._getTailKeylessValues = function(command) {
      var keylessValues = "";
      var parms = command.split(" ");

      for(var x = 2; x < parms.length; ++x) {
        keylessValues += keylessValues == "" ? parms[x] : " " + parms[x];
      }

      return keylessValues;
    }

    self.proc = new EventEmiter();

    // Bind `on` events to the eventEmiter, so instead of:
    //   ffmpeg.proc.on(event);
    // you can write:
    //   ffmpeg.on(event);
    self.on = self.proc.on.bind(self.proc);

    self._parseProgress = function(line) {
        // Values, ordered:
        //
        // [current frame, frames per second, q (codec dependant parameter),
        // target size, time mark, bitrate]
        //
        // Regex matches series of digits, 'dot' and colons.
        var progressValues = line.match(/[\d.:]+/g)

        var progress = {
            frame:      progressValues[0],
            fps:        progressValues[1],
            targetSize: progressValues[3],
            timeMark:   progressValues[4],
            kbps:       progressValues[5] || 0,  // in case of "N/A"
        }

        return progress;
    }

    self._parseInputProperties = function(line) {
        // Properties: [duration, start, bitrate]
        // Note: regex matches single ':' chars, so we remove them.
        var values = line.match(/[\d.:]+/g).filter(function(val) {
            return val !== ':';
        });

        var properties = {
            duration:      values[0],
            bitrate_kbps:  values[2]
        }

        return properties;
    }

    self._handleInfo = function(line) {
        var line = line.trim();
        if (line.substring(0, 5) === 'frame') {
            self.proc.emit('progress', self._parseProgress(line));
        }
        if (line.substring(0, 8) === 'Duration') {
            var inputProperties = self._parseInputProperties(line);
            self.properties.input = inputProperties;
            self.proc.emit('properties', {from: 'input', data: inputProperties});
        }
    }

    self.start = function(subProcess, callback) {
        var proc = null;
        console.log(subProcess)
        if(subProcess === "ffmpeg"){
            console.log("2")
          proc = spawn("ffmpeg", self._construct_options());
            console.log("3");

          // `self.proc` is the exposed EventEmitter, so we need to pass
          // events and data from the actual process to it.
          var default_events = ['message', 'error', 'exit', 'close', 'disconnect'];
          default_events.forEach(function(event) {
              proc.on(event, self.proc.emit.bind(self.proc, event));
          })

          // FFmpeg information is written to `stderr`. We'll call this
          // the `info` event.
          // `split()` makes sure the parser will get whole lines.
          proc.stderr.pipe(split(/[\r\n]+/)).on('data', self.proc.emit.bind(self.proc, 'info'));

          // We also need to pass `stderr` data to a function that will
          // filter and emit `progress` events.
          proc.stderr.pipe(split(/[\r\n]+/)).on('data', self._handleInfo);
        } else {
          //TODO something for mp4box
          proc = spawn("MP4Box", self._construct_options());

          var default_events = ['message', 'error', 'exit', 'close', 'disconnect'];
          default_events.forEach(function(event) {
              proc.on(event, self.proc.emit.bind(self.proc, event));
          })
        }

        // Return the process object, in case anyone needs it.
        if (callback) {
          callback(null, proc); // no error\
        }

        return self;
    }

    return self;
}

module.exports = EncoderWrapper;
