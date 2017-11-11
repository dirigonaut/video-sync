const Path 					= require('path');

const NUMBER 				= '^((?=.)((\\d*)(\\.(\\d+))?))$';
const ALPHANUMERIC 	= '([^\\u0000-\\u007F]|\\w|\\s)+';
const SPECIAL				= '([^\\u0000-\\u007F]|[?!&:;@.,/\\-\\\'\\\"\\s\\w\\\\])+';
const EMAIL 				= '[\\w._-]+@[\\w]+\\.[\\w]+';

var fileSystemUtils, schemaFactory, eventKeys, log;

function Sanitizer() { }

Sanitizer.prototype.initialize = function(force) {
	if(typeof Sanitizer.prototype.protoInit === 'undefined') {
    Sanitizer.prototype.protoInit = true;
		eventKeys       = this.factory.createKeys();

		fileSystemUtils = this.factory.createFileSystemUtils();
		schemaFactory 	= this.factory.createSchemaFactory();

		var logManager  = this.factory.createLogManager();
		log             = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }
};

Sanitizer.prototype.sanitize = function(data, schema, required, socket) {
	var request;

	try{
		request = sanitizeSchema.call(this, data, schema, required);
	} catch(err) {
		log.error(err);
		socket.emit(eventKeys.SERVERLOG, [data, err.toString()]);
	}

	return request;
};

module.exports = Sanitizer;

function sanitizeSchema(object, schema, required) {
	var entries = Object.entries(object);
	for(var entry of entries) {
		if(required && required.length > 0) {
			var indexOf = required.indexOf(entry[0]);
			if(indexOf > -1) {
				required.splice(indexOf, 1);
			}
		}

		var result = handleInputs.call(this, entry[0], entry[1], schema);
		schema[entry[0]] = entry[1];
	}

	if(required && required.length > 0) {
		throw new Error(`Missing ${required} entries.`);
	}

	delete schema.Enum;
	return schema;
};

function handleInputs(key, input, schema) {
	var clean;
	if(Array.isArray(input)) {
		for(var i = 0; i < input.length; ++i) {
			clean = checkInput.call(this, key, input[i], schema) ? true : false;

			if(!clean) {
				break;
			}
		}
	} else {
		clean = checkInput.call(this, key, input, schema);
	}

	if(clean) {
		return clean;
	} else {
		throw new Error(`Input ${key} should be a(n) ${schema[key]} instead of a ${input}`);
	}
}

function checkInput(key, input, schema) {
	var clean;
	var type = schema[key];
	switch (type) {
	  case 'string':
			clean = validate(input, new RegExp(ALPHANUMERIC), true);
	    break;
	  case 'number':
			clean = validate(input, new RegExp(NUMBER), true);
	    break;
		case 'bool':
			clean = typeof input === 'boolean';
			break;
		case 'path':
			clean = input !== Path.basename(input);
			break;
		case 'special':
			clean = validate(input, new RegExp(SPECIAL), true) || typeof input === 'boolean';
			break;
	  case 'email':
			clean = validate(input, new RegExp(EMAIL), true);
	    break;
		case 'command':
			var command = input.substring(1, input.length);
			clean = input[0] === "/";
			clean &= validate(command, new RegExp(ALPHANUMERIC), false);
			break;
		case 'schema':
			var nestedSchema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.SCHEMA[key.toUpperCase()]);
			clean = this.sanitize(input, nestedSchema, Object.values(nestedSchema.Enum));
			break;
	  default:
			throw new Error(`${type} is not a supported input type`);
	}

	return clean;
}

function validate(input, regex, allowEmpty) {
	var matches = regex.exec(input);

	if(allowEmpty) {
		return input === '' || typeof input === 'null' || typeof input === 'undefined' || (Array.isArray(matches) && matches[0] == input);
	} else {
		return Array.isArray(matches) && matches[0] == input;
	}
}
