function ClientObjectFactory() { }

ClientObjectFactory.prototype.initialize = function(baseFactory, enumUtils, imports) {
  ClientObjectFactory.prototype.Enum = enumUtil.createEnums(imports);
  baseFactory.generateFunctionHeaders.call(this, imports);
};

module.exports = ClientObjectFactory;
