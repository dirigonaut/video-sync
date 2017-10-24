module.exports = {
  //AdminController
  //Server
  SETMEDIA:       'admin-set-media',
  //Client
  MEDIAREADY:     'admin-media-ready',

  //Sokcet Connection Events
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
  SETTOKENLEVEL:   'set-level',
  AUTHENTICATED:  'authenticated',

  //StateController
  //Server
  REQINIT:        'state-req-init',
  REQPLAY:        'state-req-play',
  REQPAUSE:       'state-req-pause',
  REQSEEK:        'state-req-seek',
  SYNC:           'state-sync',
  PING:           'state-ping',
  CHANGESYNC:     'state-change-sync',
  UPDATEINIT:     'state-update-init',
  PLAYERINFO:     'state-metrics',
  //Client
  INIT:           'state-init',
  PLAY:           'state-play',
  PAUSE:          'state-pause',
  SEEK:           'state-seek',

  //EncodingController
  //Server
  ENCODE:         'video-encode',
  GETMETA:        'video-get-meta',
  //Client
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

  //Errors
  INPUTERROR:     'error-input',
};
