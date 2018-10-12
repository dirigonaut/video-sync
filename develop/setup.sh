#!/bin/bash
PASS=$1

apt-get update
apt-get install git nodejs npm -y

cd /opt
git clone https://github.com/dirigonaut/video-sync.git
cd /opt/video-sync
git checkout encode-refac
git pull

mkdir -p /etc/video-sync
cp /opt/video-sync/configs/config.yml /etc/video-sync/config.yml

if [[ ! -z $PASS ]]; then
  sed -i "/ #password:/c\ password: ${PASS}" /etc/video-sync/config.yml
fi

export VIDEO_SYNC_CONFIG='/etc/video-sync/config.yml'

cd /opt/video-sync
npm install
npm run-script install
npm run-script init

cp /opt/video-sync/develop/services/video-sync.service /lib/systemd/system/video-sync.service
systemctl daemon-reload
