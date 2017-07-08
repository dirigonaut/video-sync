const schemaFactory	= require('schemaFactory');

var schemaFactory;

function Sanitizer() { }

Sanitizer.prototype.initialize = function(force) {
	if(typeof Sanitizer.prototype.protoInit === 'undefined') {
    Sanitizer.prototype.protoInit = true;
    schemaFactory = this.factory.createSchemaFactory();
  }
};

Sanitizer.prototype.sanitize = function(object, schema, required) {
	var entries = object.entries();
	for(var i = 0; i < object.keys(); ++i) {
		var entry = entries.next().value;
		if(schema.keys()[entry[0]]) {
			if(required && required.length > 0) {
				var indexOf = required.indexOf(entry[0]);
				if(indexOf) {
					required = required.splice(indexOf, 1);
				}
			}

			if(checkInput(schema[entry[0]], entry[1])) {
				schema[entry[0]] = entry[1];
			} else {
				throw new Error(`Input ${entry[1]} is not of type ${schema.keys()[entry[0]]}`);
			}
		} else {
			throw new Error(`Entry ${entry[0]} does not exist in ${schema}`);
		}
	}

	if(required && required.length > 0) {
		throw new Error(`Missing ${required} entries.`);
	}

	return schema;
};

module.exports = Sanitizer;

function checkInput(type, input) {
	var clean;
	switch (type) {
	  case 'string':
			clean = schemaFactory.isAlphanumeric(input);
	    break;
	  case 'number':
			clean = schemaFactory.isNumeric(input);
	    break;
	  case 'email':
			clean = schemaFactory.isEmail(input);
	    break;
	  default:
			throw new Error(`${type} is not a supported input type`);
	}

	return clean;
}
