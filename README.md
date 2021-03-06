# Video-Sync

Note: page is under construction and needs to be updated after the most recent overhaul.

---
### Table of Contents
---
1. [What am I](#what-am-i)
2. [Setup](#setup)
3. [Watch a Video](#watch-a-video)
4. [Synchronization Techniques](#synchronization-techniques)
5. [Video Controls](#video-controls)
6. [Log in](#log-in)
7. [Encoding](#encoding)
8. [Path bar](#path-bar)
9. [Logs](#logs)
10. [Configs](#configs)
11. [Misc](#misc)
12. [Troubleshooting](#troubleshooting)
13. [License](#license)

### What am I
---
Video-Sync, until I can come up with a swankier name, is an application for hosting/watching media content online with your friends, family, strangers, or by yourself pretending you have friends. While many platforms exist already to host or watch media online very few exist that keep all players synchronized so they are watching/listening to the same part of the media at the same time. The idea behind this is an application with minimal setup for the administrator and zero setup for any other party so that anyone can enjoy their favorite media with the people they want to share it with online but with the same experience as you are all watching tv together.

### Setup
---
**Requirements**:
1. Node version >= 8.4.0
2. Ffmpeg version >= 2.7.6
3. Redis version >= 3.0.3
4. Git
5. Chrome

Download and install git if you do not already have it. Then clone this repository. If you are on Windows on a version less than 10 I would recommend getting Git Bash as it will use the same commands that linux does for installing the application environment.

Install nodejs and run the following commands from within the directory where you downloaded the code repository.

Ubuntu:
```
npm run-script install
```

Windows:
```
npm install && npm run-script init
```

Install FFmpeg and add it to your path.

Install Redis and add it to your path. Odds are Redis will be installed as a startup service so it will prevent you from starting the application as it will bind to 6379 not allowing the application to. Either you can stop this default behavior, it is a documented feature, or use terminal commands to terminate the process running on 6379.

Setup your [Configs](#configs).

Finally you will need to forward the port that you configured in the configs on your local router to resolve to your machine in the network subnet.

Start:
```npm run-script start```

Stop:
```Ctl-X in the same terminal```

To connect to the client as an admin open chrome and go to https://127.0.0.1:8080/html/client.html
- 8080 - (port specified in the [Config](#configs))

If you are using the default self signed certificate when you will need to click past the browsers security warning to proceed.

### Watch a Video
---
Once the application has been setup it is time to watch a video. This step will walk you through a basic story of inviting users and watching a video with them.

  - Setup/Start App
    - Follow steps in [Setup](#setup)
  - Log in:
    - Info [Log in](#log-in)
  - Encode Media
    - Info [Encoding](#encoding)
    - Submit the commands to encode the media file
  - Invite Users
    - tbd
  - Load Video
    - Info [Path bar](#path-bar)
    - Paste the absolute path to the media file directory and select the load button
  - Watch Video
    - Info [Video Controls](#video-controls)
    - Click play and enjoy your experience.

### Synchronization Techniques
---
Currently the synchronization events happen when a pause or seek video event is triggered. All users are set to the furthest behind persons time stamp. If a user joins or triggers a resync when they are desynced the server will set their video to the furthest ahead persons time.

The system will not currently stop players if they fall out of sync but if a sync issue is noticed a pause will synchronize everyone.

On the control bar under the gear icon there is a checkbox called "Synchronize". If that box is checked the player will receive sync events and act on them. If that box is unchecked then the individual player can issue any video command without causing those events to be sent out to any other player. The video player will also no longer respond to the server sync events.

On a play or seek event the server will not issue a resume command until it has received that each client is in a state where it has enough video/audio data to start playing.

### Video Controls
---
  - Play/Pause: Issues play or pause to the player
  - Progress bar: Shows the current progress of the video as well as allows the seek action
  - Audio: Adjust the volume of the player
  - Synchronize:
    - Resync:
  - Options:
    - Video: Select the Video quality to watch
    - Audio: Select the Audio quality to watch
    - Subtitles: Select the Subtitles to display is available
    - Buffer: How far ahead to buffer the file
    - Sync Time: Admin only
  - Fullscreen: Make the player fullscreen

### Log in
---
The Log in prompt has two fields

  - Handle: The users desired moniker
  - Token: A system generated token emailed to the users


Allowed Characters per Field:

  - Handle: [String](#misc)
  - Token: [String](#misc)

### Encoding
---
This is the front end interface with the Ffmpeg encoding solution. Currently it only supports webm encoding at the moment.

Form:

  - File to Encode: The path to the file to be encoded
  - Metadata: When the File has been specified then the metadata field will populate with the files meta info. Each tab represents a stream in the codec.
  - Output Directory: The directory to save all the encoded files to.
  - Encoding Options: These options will encode the specified file into a web compliant set of media file(s)
    - Video: The desired video quality
    - Audio: The desired Audio quality
    - Subtitle: The desired Subtitle stream track, if left blank will just grab the first one.
  - Encoding Commands: A list of what the back end commands will look like.

Buttons:

  - Video/Audio: takes the specified quality and creates a well formatted command Video/Audio encoding command
  - Subtitle: will pull out a specific subtitle track
  - Encode: Will submit the commands to the back end to encode

Encoding commands Explained:
The list of commands under encoding commands are a list of valid Ffmpeg commands that are just missing the Ffmpeg keyword infront of them. This being the case if
ou need to you can type in those fields and tweak the fields to have the desired changes and then submit them. If you are interested in this option I would recommend reading the Ffmpeg docs as well as reading up on DASH encodings.

The entries under this list will not update their values if they were changed above. Instead you will need to select the 'x' in the far right column to remove that entry and recreate it.

You might also notice there is an entry that populates on its own called the 'MANIFEST'. This is a metadata file that parses all encoded files to get their metadata. This is a required file for playing html5 compliant web videos. This field will auto update as new entries are added or removed. Though if you did encode media files outside the application then you can actually force the application to only generate the manifest. This is necessary as their is custom information that it will populate in the manifest file through outside processes.

To force the application to only generate the metadata construct all the commands as you normally would. then instead of submitting them select the checkbox on the manifest entry. This action will lock the manifest and preventing it from updating. Delete all the entries by selecting the 'x' button on the right of each entry. he manifest will be left untouched. Now click submit and it will only generate the manifest file.

You can watch the progress of an encoding by either pulling up the developer console or selecting the Log Tab next to the Chat Tab.

### Path bar
---
On the Admins client the path bar will be on the top of the screen. The button on the left is the load video button and the bar to the right is the absolute path to the directory structure that has the media files in it located on your system.

If the video player gets in a non recoverable state selecting the load button will force a reload of the video for all connected clients. This should resolve any deadlocks allowing you to seek back to where you left off and continue.

### Logs
---
Logs are split into three types. A masterProcess, serverProcess, and stateProcess. The masterProcess is responsible for spinning up the entire application. The serverProcess is responsible for most of the features of the application such as user login, requesting video data, and other non stateful calls. The stateProcess is used to keep the players synced and all other stateful operations in the application.

Each thread of the application creates its own log file with the PID used as the unique identifier.

Location:

  - Windows: %APPDATA%/video-sync/logs/
  - Linux: ~/.config/video-sync/logs/
  - Mac: ~/.config/video-sync/logs/

### Configs
---
When the application is started for the first time it will populate the associated dir with a default config template which you can then edit as necessary.

Location:

  - Windows: %APPDATA%/video-sync/
  - Linux: ~/.config/video-sync/
  - Mac: ~/.config/video-sync/

Example Config
```
{
  "port" : 8080,
  "static" : "static",
  "redis" : {
    "host" : "127.0.0.1",
    "port" : 6379,
    "password" : null
  },
  "redisPath" :  "C:\\Redis\\redis-server.exe",
}
```

Config Definitions:

  - host: The external ip that given to you by your isp.
  - port: The port that your application will start up on.
  - static: The base static file directory of that application.
  - redis: The specs of the redis server.
    - If you wish to change the info on redis you will need to also edit the redis.config
  - redisPath(optional): Pass in the dir to redis instead of using a class path.

In the same directory as the configs is the certificate for the applications https encryption. It will be auto generated if there is not already one there.

### Misc
---
**Input Type Definitions**:

  - String: Alphanumeric, spaces, and underscores
  - Email: An email patterned string that allows alphanumerics and [._-]
  - Special: Alphanumeric, spaces, and [?!&:;@.,/_-'"\\]

### Troubleshooting
---
Is the user in question using chrome as the default browser? It is the only browser this application is compatible with as of now.

Are you getting a warning insecure site when loading the page? This is an error browsers throw if a site is using a self signed certificate for https. Bypass the exception and everything will work as intended.

Client side logs are in the developer console in the browser.
Server side [Logs](#logs) are in the same dir structure as the configs.

### Licensing
---
Attributions:
- [Essential Set](https://www.flaticon.com/packs/essential-set-2) Icons designed by [Smashicons](https://www.flaticon.com/authors/smashicons) from Flaticon

---

Video-Sync Copyright 2018 Dirigonaut

The MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
