var Cluster = require('cluster');
var numCPUs = require('os').cpus().length

function ClusterManger() {

}

ClusterManager.prototype.initialize = function(masterCallback, workerCallback) {
  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });
  } else {
    workerCallback()

    console.log(`Worker ${process.pid} started`);
  }
}

module.exports = ClusterManager;
