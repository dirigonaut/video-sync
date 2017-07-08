var schemas;

function SchemaFactory() { }

SchemaFactory.prototype.initialize = function () {
  if(typeof SchemaFactory.prototype.protoInit === 'undefined') {
    SchemaFactory.prototype.protoInit = true;
    schemas = require('./Schemas');
  }
};

SchemaFactory.prototype.createSchema = function (id) {
  return Object.assign({}, getSchemaData(id).schema);
};

SchemaFactory.prototype.createDefinition = function (id) {
  return Object.assign({}, getSchemaData(id).definition);
};

module.exports = SchemaFactory;

function getSchemaData(id) {
  if(!schemas) {
    this.initialize();
  }

  var object = schemas[id];

  if(!object) {
    throw new Error(`SchemaFactory.createSchema: id '${id}' is not valid.`);
  }

  return object.schema;
}
