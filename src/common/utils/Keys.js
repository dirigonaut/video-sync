module.exports = {
  //AdminController
  //Server
  SETMEDIA:       'admin-set-media',
  SETSYNCRULE:    'admin-set-sync',
  GETSYNCRULE:    'admin-get-sync',
  GETCONTENTS:    'admin-get-contents',
  MEDIADIR:       'admin-media-folders',
  ENCODEDIR:      'admin-encode-files',

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
  GETENCODE:      'video-get-encode',
  GETMETA:        'video-get-meta',
  //Client
  ENCODECANCELED: 'video-encode-canceled',
  ENCODINGS:      'video-encodings',
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
  ENCODELOG:      'system-encoding',
};
