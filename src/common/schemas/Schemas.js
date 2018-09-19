var Schemas = {
  //Request
  string: { schema: { data: undefined},
    definition: { data: 'string',
    Enum: { DATA: 'data' } } },

  special: { schema: { data: undefined},
    definition: { data: 'special',
    Enum: { DATA: 'data' } } },

  number: { schema: { data: undefined},
    definition: { data: 'number',
    Enum: { DATA: 'data' } } },

  bool: { schema: { data: undefined},
    definition: { data: 'bool',
    Enum: { DATA: 'data' } } },

  pair: { schema: { id: undefined, data: undefined },
    definition: { id: 'string', data: 'special',
    Enum: { ID: 'id', DATA: 'data' } } },

  state: { schema: { timestamp: undefined, state: undefined, buffered: undefined },
    definition: { timestamp: 'number', state: 'bool', buffered: 'bool',
    Enum: { TIMESTAMP: 'timestamp', STATE: 'state', BUFFERED: 'buffered' } } },

  video: { schema: { typeId: undefined, path: undefined, segment: undefined },
    definition: { typeId: 'number', path: 'special', segment: 'string',
    Enum: { TYPEID: 'typeId', PATH: 'path', SEGMENT: 'segment' } } },

  //Response
  response: { schema: { data: undefined } },

  idResponse: { schema: { id: undefined, data: undefined } },

  logResponse: { schema: { time: undefined, level: undefined, label: undefined, data: undefined, meta: undefined } },

  videoResponse: { schema: { typeId: undefined, name: undefined, data: undefined, index: undefined } },

  stateResponse: { schema: { play: undefined, time: undefined } }
};

module.exports = Schemas;
