const MasterProcess = require('./src/server/process/MasterProcess');
var masterProcess = new MasterProcess();
masterProcess.start().catch(masterProcess.getLog().error);
