module.exports = {
  //AdminController
  //Server
  INVITE:         'admin-smtp-invited',
  SETMEDIA:       'admin-set-media',
  LOADSESSION:    'admin-load-session',
  //Client
  INVITED:        'admin-smtp-invited',
  MEDIAREADY:     'admin-media-ready',
  LOADEDSESSION:  'admin-loaded-session',

  //AuthenticationController
  //Server
  GETTOKEN:       'auth-get-token',
  AUTHTOKEN:      'auth-validate-token',
  DISCONNECT:     'disconnect',
  //Client
  CONNECTED:      'connected',
  SENTTOKEN:      'auth-token',
  AUTHENTICATED:  'authenticated',

  //ChatController
  //Server
  BROADCAST:      'chat-broadcast',
  COMMAND:        'chat-command',
  //Client
  HANDLES:        'chat-handles',
  BROADCASTRESP:  'chat-broadcast-resp',
  EVENTRESP:      'chat-event-resp',
  PINGRESP:       'chat-ping-resp',
  LOGRESP:        'chat-log-resp',

  //DatabaseController
  //Server
  CREATESMTP:     'db-create-smtp',
  CREATESESSION:  'db-create-session',
  READSMTP:       'db-read-smpts',
  READSESSIONS:   'db-read-sessions',
  UPDATESMTP:     'db-update-smtp',
  UPDATESESSION:  'db-update-session',
  DELETESMTP:     'db-delete-smtp',
  DELETESESSION:  'db-delete-session',
  //Client
  SMTP:           'db-smtp',
  SESSION:        'db-sessions',
  DBREFRESH:      'db-refresh',

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
};
