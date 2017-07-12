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
		if(schema[entry[0]]) {
			if(required && required.length > 0) {
				var indexOf = required.indexOf(entry[0]);
				if(indexOf > -1) {
					required.splice(indexOf, 1);
				}
			}

			if(object[entry[0]]) {
				if(handleInputs(schema[entry[0]], entry[1])) {
					schema[entry[0]] = entry[1];
				} else {
					throw new Error(`Input ${entry[0]} should be a ${schema[entry[0]]} instead of a ${entry[1]}`);
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

function handleInputs(type, input) {
	var clean;
	if(Array.isArray(input)) {
		for(var i = 0; i < input.length; ++i) {
			clean = checkInput(type, input[i]);
			if(!clean) {
				break;
			}
		}
	} else {
		clean = checkInput(type, input);
	}

	return clean;
}

function checkInput(type, input) {
	var clean;
	switch (type) {
	  case 'string':
			clean = validator.isAlphanumeric(input);
	    break;
	  case 'number':
			clean = validator.isNumeric(input);
	    break;
		case 'range':
			if(input.contains('-')) {
				var values = input.split('-');
				if(values.length === 2) {
					clean = validator.isNumeric(values[0]);
					clean &= validator.isNumeric(values[1]);
				}
			}
			break;
		case 'path':
			clean = fileSystemUtils.isPath(input);
			break;
	  case 'email':
			clean = validator.isEmail(input);
	    break;
	  default:
			throw new Error(`${type} is not a supported input type`);
	}

	return clean;
}
