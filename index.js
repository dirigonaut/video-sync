const MasterProcess = require('./src/server/process/MasterProcess');
var masterProcess = new MasterProcess();
yield masterProcess.start().catch(masterProcess.getLog().error);
