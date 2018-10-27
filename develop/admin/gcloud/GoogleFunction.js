const Client    = require('ssh2').Client;
const {Storage} = require('@google-cloud/storage');
const Compute   = require('@google-cloud/compute');
const storage   = new Storage();
const compute   = Compute();

const ENVS = {
  KEYS    : process.env.KEYS    ? process.env.KEYS    : new Error("Missing Env Var KEYS"),
  USER    : process.env.USER    ? process.env.USER    : new Error("Missing Env Var USER"),
  PRIVKEY : process.env.PRIVKEY ? process.env.PRIVKEY : new Error("Missing Env Var PRIVKEY"),
  VM      : process.env.VM      ? process.env.VM      : new Error("Missing Env Var VM"),
  BUCKET  : process.env.BUCKET  ? process.env.BUCKET  : new Error("Missing Env Var BUCKET"),
  ADMIN   : process.env.ADMIN   ? process.env.ADMIN   : new Error("Missing Env Var ADMIN"),
  LOGIN   : process.env.LOGIN   ? process.env.LOGIN   : new Error("Missing Env Var LOGIN")
};

for(var i in ENVS) {
  if(ENVS[i] instanceof Error){
    throw ENVS[i];
  }
}

// Authentication / Controller
exports.endPoint = function(req, res) {
  getFileFromStorage(ENVS.KEYS)
 .then(keys => { return authenticate(keys, req.headers); })
 .then(function() { return controller(req.body.operation, req.body.action); })
 .then(resp => {
   var pair = decodeToken(req.headers.authorization);
   console.info(`${pair.user} has issued command ${req.body.operation}`);
   res.status(200).send(resp);
 }).catch( err => {
   switch (err) {
     case "401":
       if (typeof req.body.operation === "undefined") {
         getFileFromStorage(ENVS.LOGIN)
                .then(html => { res.status(200).send(html); })
                .catch(error => {res.status(400).send(err); });
         break; //skip to default if there is an operation in the body with a 401
       }
     default:
       res.status(400).send(err);
       break;
   }
 });
};

var controller = function(operation, action) {
  console.log(`controller: ${operation}`);
  switch(operation) {
    case "start":
      return startStopInstance('start');
    case "stop":
      return startStopInstance('stop');
    case "status":
      return statusInstance();
    case "action":
      return actionInstance(action);
    default:
      return getFileFromStorage(ENVS.ADMIN);
  }
};

// Operations
var startStopInstance = function(action) {
  console.log(action);
  return getVm(ENVS.VM).then(inst => { return setVmOperation(inst, action); });
};

var statusInstance = function() {
  console.log("status");
  return getVm(ENVS.VM).then(resp => { return resp.metadata; });
};

var actionInstance = function(id) {
  console.log(`action: ${id}`);
  return getVm(ENVS.VM)
  .then(function(inst) {
    return Promise.all([getIp(inst), getFileFromStorage(ENVS.PRIVKEY)]);
  }).then(function(results) {
    results.push(getCommand(id));
    return ssh.apply(ssh, results);
  }).then(function(code) {
    return `Action: ${id} returned ${code}`;
  });
};

// Utility Functions
var authenticate = function(keys, headers) {
  console.log("authenticate");
  var auth;

  try {
    var token = headers.authorization;
    keys = JSON.parse(keys).Auth;
    auth = keys && keys.length > 0 && keys.includes(token);
  } catch (e) {
  	console.error(e);
  }

  return auth ? Promise.resolve() : Promise.reject("401");
};

var decodeToken = function(value) {
  console.log("decodeToken");
  var entries = (new Buffer(value.replace("Basic", ""), 'base64'))
                .toString('utf8').split(":");
  return { "user": entries[0], "pass": entries[1] };
};

var ssh = function(ip, key, command) {
  console.log("ssh");
  return new Promise(function(resolve,reject) {
    try {
      var conn = new Client();

      conn.on('ready', function() {
        console.log("Sshed into box.");
        conn.exec(command, function(err, stream) {
          console.log("Command running on box.");
          if (err) {
            reject(err);
          }

          stream.on('exit', function(code, signal) {
            console.log("Command finished on box.");
            conn.end();
            resolve(code);
          });
        });
      }).connect({
        host: ip,
        port: 22,
        username: ENVS.USER,
        privateKey: key
      });
    } catch (e) {
      console.error(e);
      reject("Failed to connect.");
    }
  });
};

var getCommand = function(key) {
  console.log(`getCommand: ${key}`);
  switch(key) {
    case "video-sync-start":
      return "sudo systemctl start video-sync";
   	case "video-sync-stop":
      return "sudo systemctl stop video-sync";
    case "encode-start":
      return "sudo systemctl start encode";
    default:
      throw new Error(`Action ${key} is not supported.`);
  }
};

var getFileFromStorage = function(fileName) {
  console.log(`getFileFromStorage: ${fileName}`);
  var file = storage.bucket(ENVS.BUCKET).file(fileName);
  return new Promise(function(resolve, reject) {
    var contents = '';

    file.createReadStream()
    .on('data', data => { contents += data; console.log(`Streaming ${fileName}`); })
    .on('error', err => { reject(err); console.error(`Error ${fileName}`); })
    .on('end', function () { resolve(contents.toString('utf8')); console.log(`Finished ${fileName}`); });
  });
};

var getVm = function(vmFilter) {
  console.log(`getVm: ${vmFilter}`);
  return new Promise(function(resolve, reject) {
    compute.getVMs(vmFilter, function(err, resp) {
      if(err) {
        reject(err);
      } else {
        if(resp && resp.length > 0 && resp[0]) {
          resolve(resp[0]);
        } else {
          reject("No vm found.");
        }
      }
	});
  });
};

var setVmOperation = function(vm, action) {
  console.log(`setVmOperation: ${action}`);
  return new Promise(function(resolve, reject) {
    vm[action](function(err, operation, apiResponse) {
      	if(err) {
          reject(err);
        } else {
          resolve(apiResponse);
        }
    });
  });
};

var getIp = function(inst) {
  console.log("getIp");
  return new Promise(function(resolve,reject) {
    try {
      var ip = inst.metadata.networkInterfaces[0].accessConfigs[0].natIP;
      resolve(ip)
    } catch (e) {
      console.error(e);
      reject("Can't get instance info");
    }
  });
};
