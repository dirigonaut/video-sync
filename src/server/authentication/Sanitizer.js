const validator	= require('validator');

var fileSystemUtils;

function Sanitizer() { }

Sanitizer.prototype.initialize = function(force) {
	if(typeof Sanitizer.prototype.protoInit === 'undefined') {
    Sanitizer.prototype.protoInit = true;
		fileSystemUtils = this.factory.createFileSystemUtils();
  }
};

Sanitizer.prototype.sanitize = function(object, schema, required) {
	var entries = Object.entries(object);
	for(var entry of entries) {
		if(schema[entry[0]] !== undefined) {
			if(required && required.length > 0) {
				var indexOf = required.indexOf(entry[0]);
				if(indexOf > -1) {
					required.splice(indexOf, 1);
				}
			}

			if(object[entry[0]] !== undefined) {
				if(handleInputs.call(this, schema[entry[0]], entry[1], schema)) {
					schema[entry[0]] = entry[1];
				} else {
					throw new Error(`Input ${entry[0]} should be a(n) ${schema[entry[0]]} instead of a ${entry[1]}`);
				}
			}
		} else {
			throw new Error(`Entry ${entry[0]} does not exist in ${JSON.stringify(object)}`);
		}
	}

	if(required && required.length > 0) {
		throw new Error(`Missing ${required} entries.`);
	}

	return schema;
};

module.exports = Sanitizer;

function handleInputs(type, input, schema) {
	var clean;
	if(Array.isArray(input)) {
		for(var i = 0; i < input.length; ++i) {
			clean = checkInput.call(this, type, input[i], schema);
			if(!clean) {
				break;
			}
		}
	} else {
		clean = checkInput.call(this, type, input, schema);
	}

	return clean;
}

function checkInput(type, input, schema) {
	var clean;
	switch (type) {
	  case 'string':
			clean = validator.isAlphanumeric(input  + '');
	    break;
		case 'bool':
			clean = validator.isBoolean(input + '');
			break;
	  case 'number':
			clean = validator.isNumeric(input + '');
	    break;
		case 'ascii':
			clean = validator.isAscii(input + '');
			break;
		case 'array':
			clean = true;
			for(let i = 0; i < input.length; ++i) {
				clean &= validator.isAlphanumeric(input[i]  + '');
			}
			break;
		case 'path':
			clean = fileSystemUtils.isPath(input);
			break;
	  case 'email':
			clean = validator.isEmail(input + '');
	    break;
		case 'schema':
			clean = this.sanitize(input, schema, Object.values(schema.Enum));
			break;
	  default:
			throw new Error(`${type} is not a supported input type`);
	}

	return clean;
}
