var Schemas = {
  //Request
  path: { schema: { data: undefined},
    definition: { data: 'path',
    Enum: { DATA: 'data' } } },

  string: { schema: { data: undefined},
    definition: { data: 'string',
    Enum: { DATA: 'data' } } },

  number: { schema: { data: undefined},
    definition: { data: 'number',
    Enum: { DATA: 'data' } } },

  login: { schema: { handle: undefined, address: undefined, token: undefined },
    definition: { handle: 'string', address: 'email', token: 'string',
    Enum: { HANDLE: 'handle', ADDRESS: 'address', TOKEN: 'token' } } },

  command: { schema: { command: undefined, param: undefined },
    definition: { command: 'string', param: 'string',
    Enum: { COMMAND: 'command', PARAM: 'param' } } },

  smtp: { schema: { _id: undefined, smtpType: undefined, smtpHost: undefined, smtpAddress: undefined, smtpPassword: undefined },
    definition: { _id: 'string', smtpType: 'string', smtpHost: 'string', smtpAddress: 'email', smtpPassword: 'string',
    Enum: { ID: '_id', SMTPTYPE: 'smtpType', SMTPHOST: 'smtpHost', SMTPADDRESS: 'smtpAddress', SMTPPASSWORD: 'smtpPassword' } } },

  session: { schema: { _id: undefined, title: undefined, smtp: undefined, invitees: undefined, mailOptions: undefined },
    definition: { _id: 'string', title: 'string', smtp: 'email', invitees: 'email', mailOptions: 'string',
    Enum: { ID: '_id', TITLE: 'title', SMTP: 'smtp', INVITEES: 'invitees', MAILOPTIONS: 'mailOptions' } } },

  state: { schema: { timestamp: undefined, state: undefined, buffering: undefined },
    definition: { timestamp: 'number', state: 'string', buffering: 'string',
    Enum: { TIMESTAMP: 'timestamp', STATE: 'state', BUFFERING: 'buffering' } } },

  video: { schema: { typeId: undefined, path: undefined, segment: undefined },
    definition: { typeId: 'number', path: 'string', segment: 'range',
    Enum: { TYPEID: 'typeId', PATH: 'path', SEGMENT: 'segment' } } },

  encode: { schema: { timestamp: undefined, state: undefined, buffering: undefined },
    definition: { timestamp: 'number', state: 'string', buffering: 'string',
    Enum: { TIMESTAMP: 'timestamp', STATE: 'state', BUFFERING: 'buffering' } } },

  //Response
  response: { schema: { data: undefined } },

  idResponse: { schema: { id: undefined, data: undefined } },

  chatResponse: { schema: { from: undefined, data: undefined } },

  videoResponse: { schema: { typeId: undefined, name: undefined, data: undefined, index: undefined } },

  stateResponse: { schema: { play: undefined, time: undefined, sync: undefined, buffered: undefined } }
};

module.exports = Schemas;
