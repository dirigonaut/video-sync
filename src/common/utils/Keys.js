module.exports = {
  //AdminController
  //Server
  SETMEDIA:       'admin-set-media',
  SETSYNCRULE:    'admin-set-sync',
  GETSYNCRULE:    'admin-get-sync',
  //Client
  SYNCRULE:       'admin-sync-rule',
  MEDIAREADY:     'admin-media-ready',

  //Socket Connection Events
  ERROR:          'error',
  DISCONNECT:     'disconnect',
  RECONNECT:      'reconnect',

  //CredentialController
  //Server
  TOKENS:         'tokens',
  AUTHTOKEN:      'auth-token',
  SHUTDOWN:       'shutdown',
  //Client
  CREATETOKENS:   'gen-tokens',
  DELETETOKENS:   'delete-tokens',
  SETTOKENLEVEL:  'set-level',
  GETTOKENS:      'get-tokens',
  AUTHENTICATED:  'authenticated',

  //StateController
  //Server
  REQINIT:        'state-req-init',
  REQPLAY:        'state-req-play',
  REQPAUSE:       'state-req-pause',
  REQSEEK:        'state-req-seek',
  SYNC:           'state-sync',
  SYNCING:        'state-syncing',
  PING:           'state-ping',
  UPDATEINIT:     'state-update-init',
  SYNCINFO:       'state-metrics',
  //Client
  INIT:           'state-init',
  PLAY:           'state-play',
  PAUSE:          'state-pause',
  SEEK:           'state-seek',

  //EncodingController
  //Server
  ENCODE:         'video-encode',
  CANCELENCODE:   'video-cancel-encode',
  GETMETA:        'video-get-meta',
  //Client
  ENCODINGS:      'video-encodins',
  ENCODED:        'video-encoded',
  META:           'video-meta',

  //VideoController
  //Server
  FILES:          'video-files',
  SUBTITLES:      'video-subtitles',
  SEGMENT:        'video-segment',
  NOFILES:        'video-no-files',
  //Client
  SEGMENTCHUNK:   'segemnt-chunk',

  //FileBuffer
  FILEREGISTER:   'file-register',
  FILESEGMENT:    'file-segment',
  FILEEND:        'file-end',

  //Confirmation
  CONFIRM:        'system-confirm',

  //CLIENTLOGGING
  SERVERLOG:      'system-logging',
  NOTIFICATION:   'system-notification',
  PROGRESS:       'system-progress',
};
