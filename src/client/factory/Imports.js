const ClientLogManager  = require('../log/ClientLogManager');
const ClientSocket      = require('../socket/ClientSocket');
const ChatUtil          = require('../utils/ChatUtil');
const EncodeFactory     = require('../utils/EncodeFactory');
const FileBuffer        = require('../utils/FileBuffer');
const FormData          = require('../utils/FormData');
const MetaState         = require('../video/meta/MetaState');
const Mp4Parser         = require('../video/meta/Mp4Parser');
const MpdMeta           = require('../video/meta/MpdMeta');
const WebmParser        = require('../video/meta/WebmParser');
const MediaController   = require('../video/MediaController');
const MetaManager       = require('../video/MetaManager');
const SourceBuffer      = require('../video/SourceBuffer');
const VideoSingleton    = require('../video/VideoSingleton');
const SchemaFactory     = require('../../common/schemas/SchemaFactory');

module.exports = {
  ClientLogManager: ClientLogManager,
  ClientSocket:     ClientSocket,
  ChatUtil:         ChatUtil,
  EncodeFactory:    EncodeFactory,
  FileBuffer:       FileBuffer,
  FormData:         FormData,
  MetaState:        MetaState,
  Mp4Parser:        Mp4Parser,
  MpdMeta:          MpdMeta,
  WebmParser:       WebmParser,
  MediaController:  MediaController,
  MetaManager:      MetaManager,
  SourceBuffer:     SourceBuffer,
  VideoSingleton:   VideoSingleton,
  SchemaFactory:    SchemaFactory
};
