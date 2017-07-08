FROM ubuntu
RUN apt-get update

#Build Dependencies
RUN apt-get -y install autoconf automake build-essential libass-dev libfreetype6-dev \
  libsdl2-dev libtheora-dev libtool libva-dev libvdpau-dev libvorbis-dev libxcb1-dev libxcb-shm0-dev \
  libxcb-xfixes0-dev pkg-config texinfo wget zlib1g-dev

#Yasm an assembler for x86 optimizations used by x264 and FFmpeg.
RUN apt-get install yasm

#NASM assembler. Required for compilation of x264 and other tools.
WORKDIR ~/ffmpeg_sources
RUN wget http://www.nasm.us/pub/nasm/releasebuilds/2.13.01/nasm-2.13.01.tar.bz2
RUN tar xjvf nasm-2.13.01.tar.bz2

WORKDIR ~/ffmpeg_sources/nasm-2.13.01
RUN ls -als
RUN ./autogen.sh
RUN PATH="$HOME/bin:$PATH" ./configure --prefix="$HOME/ffmpeg_build" --bindir="$HOME/bin"
RUN PATH="$HOME/bin:$PATH" make
RUN make install

WORKDIR /

#libx264 H.264 video encoder.
RUN apt-get -y install libx264-dev

#libx265 H.265/HEVC video encoder.
RUN apt-get -y install libx265-dev

#libfdk-aac AAC audio encoder.
RUN apt-get -y install libfdk-aac-dev

#libmp3lame MP3 audio encoder.
RUN apt-get -y install libmp3lame-dev

#libopus Opus audio decoder and encoder.
RUN apt-get -y install libopus-dev

#libvpx VP8/VP9 video encoder and decoder.
RUN apt-get -y install libvpx-dev

WORKDIR ~/ffmpeg_sources
RUN wget http://ffmpeg.org/releases/ffmpeg-snapshot.tar.bz2
RUN tar xjvf ffmpeg-snapshot.tar.bz2

WORKDIR ~/ffmpeg_sources/ffmpeg
RUN PATH="$HOME/bin:$PATH" PKG_CONFIG_PATH="$HOME/ffmpeg_build/lib/pkgconfig" ./configure \
  --prefix="$HOME/ffmpeg_build" \
  --pkg-config-flags="--static" \
  --extra-cflags="-I$HOME/ffmpeg_build/include" \
  --extra-ldflags="-L$HOME/ffmpeg_build/lib" \
  --bindir="$HOME/bin" \
  --enable-gpl \
  --enable-libass \
  --enable-libfdk-aac \
  --enable-libfreetype \
  --enable-libmp3lame \
  --enable-libopus \
  --enable-libtheora \
  --enable-libvorbis \
  --enable-libvpx \
  --enable-libx264 \
  --enable-libx265 \
  --enable-nonfree
RUN PATH="$HOME/bin:$PATH" make
RUN make install
RUN hash -r
