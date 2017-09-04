var Schemas = {
  //Request
  path: { schema: { data: undefined},
    definition: { data: 'path',
    Enum: { DATA: 'data' } } },

  string: { schema: { data: undefined},
    definition: { data: 'string',
    Enum: { DATA: 'data' } } },

  special: { schema: { data: undefined},
    definition: { data: 'special',
    Enum: { DATA: 'data' } } },

  number: { schema: { data: undefined},
    definition: { data: 'number',
    Enum: { DATA: 'data' } } },

  login: { schema: { handle: undefined, address: undefined, token: undefined },
    definition: { handle: 'string', address: 'email', token: 'string',
    Enum: { HANDLE: 'handle', ADDRESS: 'address', TOKEN: 'token' } } },

  command: { schema: { command: undefined, param: undefined },
    definition: { command: 'command', param: 'string',
    Enum: { COMMAND: 'command', PARAM: 'param' } } },

  smtp: { schema: { _id: undefined, smtpType: undefined, smtpHost: undefined, smtpAddress: undefined, smtpPassword: undefined },
    definition: { _id: 'string', smtpType: 'string', smtpHost: 'string', smtpAddress: 'email', smtpPassword: 'string',
    Enum: { ID: '_id', SMTPTYPE: 'smtpType', SMTPHOST: 'smtpHost', SMTPADDRESS: 'smtpAddress', SMTPPASSWORD: 'smtpPassword' } } },

  mailOptions: { schema: { sender: undefined, to: undefined, subject: undefined, text: undefined },
    definition: { sender: 'email', to: 'special', subject: 'string', text: 'string',
    Enum: { SENDER: 'sender', TO: 'to', SUBJECT: 'subject', TEXT: 'text' } } },

  session: { schema: { _id: undefined, title: undefined, smtp: undefined, invitees: undefined, mailOptions: undefined },
    definition: { _id: 'string', title: 'string', smtp: 'email', invitees: 'email', mailOptions: 'schema',
    Enum: { ID: '_id', TITLE: 'title', SMTP: 'smtp', INVITEES: 'invitees', MAILOPTIONS: 'mailOptions' } } },

  state: { schema: { timestamp: undefined, state: undefined, buffered: undefined },
    definition: { timestamp: 'number', state: 'bool', buffered: 'bool',
    Enum: { TIMESTAMP: 'timestamp', STATE: 'state', BUFFERED: 'buffered' } } },

  video: { schema: { typeId: undefined, path: undefined, segment: undefined },
    definition: { typeId: 'number', path: 'special', segment: 'string',
    Enum: { TYPEID: 'typeId', PATH: 'path', SEGMENT: 'segment' } } },

  //Response
  response: { schema: { data: undefined } },

  idResponse: { schema: { id: undefined, data: undefined } },

  chatResponse: { schema: { from: undefined, data: undefined } },

  logResponse: { schema: { time: undefined, level: undefined, label: undefined, text: undefined, meta: undefined } },

  videoResponse: { schema: { typeId: undefined, name: undefined, data: undefined, index: undefined } },

  stateResponse: { schema: { play: undefined, time: undefined } }
};

module.exports = Schemas;
