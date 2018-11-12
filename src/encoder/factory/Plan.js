const Crypto = require("crypto");
const Util   = require("util");

function Plan() { }

Plan.prototype.initialize = function() {
  this.processes = [];
  this.statuses  = {};
};

Plan.prototype.getHash = function() {
  while(true) {
    hash = Crypto.randomBytes(32).toString("hex");
    if(typeof this.processes[hash] === "undefined") {
      return hash;
    }
    continue;
  }
};

Plan.prototype.setPlan = function(plan) {
  this.plan = plan;
};

Plan.prototype.parse = function() {
  if(this.plan) {
    plan = JSON.parse(this.plan);

    for(let i = 0; i < plan.processes.length; ++i) {
      let encodeProcess;

      if(typeof plan.processes[i][1]["FfmpegProcess"] !== "undefined") {
        encodeProcess = this.factory.createFfmpegProcess();
        encodeProcess.setCommand(plan.processes[i][1]["FfmpegProcess"]);
      } else if(typeof plan.processes[i][1]["WebmMetaProcess"] !== "undefined") {
        encodeProcess = this.factory.createWebmMetaProcess();
        encodeProcess.setCommand(plan.processes[i][1]["WebmMetaProcess"]);
      } else {
        throw new Error(`${plan.processes[i][1]} is not a supported process.`);
      }

      if(encodeProcess) {
        this.processes.push([plan.processes[i][0], encodeProcess]);
      }
    }
  } else {
    throw new Error("No plan is set to parse.");
  }

  delete this.plan;
};

Plan.prototype.stringify = function() {
  return Util.inspect(this, { showHidden: false, depth: null, maxArrayLength: null });
};

Plan.prototype.inspect = function() {
  var processes = [];
  var statuses = [];

  this.processes.forEach((element) => {
    processes.push([`"${element[0]}"`, Util.inspect(element[1], { showHidden: false, depth: null, maxArrayLength: null })]);
  });

  Object.keys(this.statuses).forEach((element) => {
    statuses.push([`"${element}"`, JSON.stringify(this.statuses[element])]);
  });

  return `{ "processes" : [[${processes.join("], [")}]], "statuses": [[${statuses.join("], [")}]] }`;
};

module.exports = Plan;
