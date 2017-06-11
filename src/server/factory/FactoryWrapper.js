var factory;

function FactoryWrapper() { }

FactoryWrapper.prototype.setFactory = function(factoryInstance) {
  factory = factoryInstance;
};

FactoryWrapper.prototype.getFactory = function() {
  return factory;
};

module.exports =  FactoryWrapper;
