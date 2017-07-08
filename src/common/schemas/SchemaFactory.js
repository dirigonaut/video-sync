var schemas;

function SchemaFactory() { }

SchemaFactory.prototype.initialize = function () {
  if(typeof SchemaFactory.prototype.protoInit === 'undefined') {
    SchemaFactory.prototype.protoInit = true;
    schemas = require('./Schemas');

    var legend = {};
    var keys = Object.keys(schemas)
    for(var i in keys) {
      legend[String(keys[i]).toUpperCase()] = keys[i];
    }

    if(Object.keys(legend).length > 0) {
      SchemaFactory.prototype.Enum = legend;
    }
  }
};

SchemaFactory.prototype.createSchema = function (id) {
  return Object.assign({}, getSchemaData.call(this, id).schema);
};

SchemaFactory.prototype.createDefinition = function (id) {
  return Object.assign({}, getSchemaData.call(this, id).definition);
};

module.exports = SchemaFactory;

function getSchemaData(id) {
  if(!schemas) {
    this.initialize();
  }

  var object = schemas[id];
  if(!object) {
    throw new Error(`SchemaFactory.createSchema: id ${id} is not valid.`);
  }

  return object;
}
