# Video-Sync

### Table of Contents
---
1. [What am I](#what-am-i)
2. [Setup](#setup)
3. [Watch a Video](#watch-a-video)
4. [Synchronization Techniques](#synchronization-techniques)
5. [Video Controls](#video-controls)
6. [Log in](#log%20in)
7. [Session](#session)
8. [Email](#email)
9. [Encoding](#encoding)
10. [Chat](#chat)
11. [Logs](#logs)
12. [Configs](#configs)
13. [Misc](#misc)
14. [Troubleshooting](#troubleshooting)
15. [License](#license)

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

Download and install git if you do not already have it. Then clone this repository.

Install nodejs and run the following commands from within the directory where you downloaded the code repository.

```npm install npm@latest -g``` *Updates npm: may require elevated access to run*

```npm install``` *Installs the necessary dependencies*

Install Ffmpeg and Redis and add them both to your path

### Watch a Video
---
### Synchronization Techniques
---
Currently the synchronization events happen when a pause or seek video event is triggered. All users are set to the furthest behind persons time stamp. If a user joins or triggers a resync when they are desynced the server will set their video to the furthest ahead persons time.

The system will not currently stop players if they fall out of sync but if a sync issue is noticed a pause will synchronize everyone.

On the control bar under the gear icon there is a checkbox called "Synchronize". If that box is checked the player will receive sync events and act on them. If that box is unchecked then the individual player can issue any video command without causing those events to be sent out to any other player. The video player will also no longer respond to the server sync events.

On a play or seek event the server will not issue a resume command until it has received that each client is in a state where it has enough video/audio data to start playing.

### Video Controls
---
- Play/Pause:
- Progress bar:
- Audio:
- Volume:
- Options:
  - Type:
  - Video:
  - Audio:
  - Subtitles:
  - Buffer:
  - Synchronize:
  - Force Buffer:
- Fullscreen:

### Log in
---
The Log in prompt has three fields
- Handle: The users desired moniker
- Email: The email address the user received the invitation with
- Token: A system generated token emailed to the users

To get a token just submit your email and handle in the prompt. If you are a valid user then the system will generate a random password and email it to the email you entered. If you accidentally closed the prompt click the button of a person on the left side bar. Only one user can be logged in per email address at a time one.

Allowed Characters per Field
- Handle: String
- Email: Email
- Token: String

### Session
---
### Email
---
### Encoding
---
### Chat
---
### Logs
---
### Configs
---
### Misc
---
**Input Type Definitions**:
- String: Alphanumeric, spaces, and underscores
- Email: An email patterned string that allows alphanumerics and [._-]
- Special: Alphanumeric, spaces, and [?!&:;@.,/_-'"\\]

### Troubleshooting
---
### License
---
Figure out my license eventually...
