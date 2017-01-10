# README #

This README would normally document whatever steps are necessary to get your application up and running.

### What is this repository for? ###

* Quick summary
* Version
* [Learn Markdown](https://bitbucket.org/tutorials/markdowndemo)

### How do I get set up? ###

#### Set Up
Install nodejs and npm from https://nodejs.org/

```
./configure
make
sudo make install
sudo npm install npm -g
```
Install dependencies

```
npm update
```
Start nodewebkit

```
#!bash

npm start
```

sudo nwbuild -v 0.12.3 -p win64 /path/to/app/

Ffmpeg:
ffmpeg version 2.7.6-0ubuntu0.15.10.1 Copyright (c) 2000-2016 the FFmpeg developers
built with gcc 5.2.1 (Ubuntu 5.2.1-22ubuntu2) 20151010
configuration: --prefix=/usr --extra-version=0ubuntu0.15.10.1 --build-suffix=-ffmpeg --toolchain=hardened --libdir=/usr/lib/x86_64-linux-gnu --incdir=/usr/include/x86_64-linux-gnu --enable-gpl --enable-shared --disable-stripping --enable-avresample --enable-avisynth --enable-frei0r --enable-gnutls --enable-ladspa --enable-libass --enable-libbluray --enable-libbs2b --enable-libcaca --enable-libcdio --enable-libflite --enable-libfontconfig --enable-libfreetype --enable-libfribidi --enable-libgme --enable-libgsm --enable-libmodplug --enable-libmp3lame --enable-libopenjpeg --enable-openal --enable-libopus --enable-libpulse --enable-librtmp --enable-libschroedinger --enable-libshine --enable-libspeex --enable-libtheora --enable-libtwolame --enable-libvorbis --enable-libvpx --enable-libwavpack --enable-libwebp --enable-libxvid --enable-libzvbi --enable-opengl --enable-x11grab --enable-libdc1394 --enable-libiec61883 --enable-libzmq --enable-libssh --enable-libsoxr --enable-libx264 --enable-libopencv --enable-libx265
libavutil      54. 27.100 / 54. 27.100
libavcodec     56. 41.100 / 56. 41.100
libavformat    56. 36.100 / 56. 36.100
libavdevice    56.  4.100 / 56.  4.100
libavfilter     5. 16.101 /  5. 16.101
libavresample   2.  1.  0 /  2.  1.  0
libswscale      3.  1.101 /  3.  1.101
libswresample   1.  2.100 /  1.  2.100
libpostproc    53.  3.100 / 53.  3.100


MP4Box:
MP4Box - GPAC version 0.5.2-DEV-revVersion: 0.5.2-426-gc5ad4e4+dfsg5-1build1
GPAC Copyright (c) Telecom ParisTech 2000-2012
GPAC Configuration: --build=x86_64-linux-gnu --prefix=/usr --includedir=${prefix}/include --mandir=${prefix}/share/man --infodir=${prefix}/share/info --sysconfdir=/etc --localstatedir=/var --disable-silent-rules --libdir=${prefix}/lib/x86_64-linux-gnu --libexecdir=${prefix}/lib/x86_64-linux-gnu --disable-maintainer-mode --disable-dependency-tracking --prefix=/usr --libdir=lib/x86_64-linux-gnu --mandir=${prefix}/share/man --extra-cflags=-Wall -fPIC -DPIC -I/usr/include/mozjs -DXP_UNIX -D_FORTIFY_SOURCE=2 -g -O2 -fstack-protector-strong -Wformat -Werror=format-security --extra-ldflags=-Wl,-Bsymbolic-functions -Wl,-z,relro --enable-joystick --enable-debug --disable-ssl
Features: GPAC_64_BITS GPAC_HAS_JPEG GPAC_HAS_PNG
