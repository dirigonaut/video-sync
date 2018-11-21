#!/bin/bash
DOMAIN=$1
DRY=$2

add-apt-repository ppa:certbot/certbot -y
apt-get install certbot software-properties-common -y
apt-get update

certbot certonly --staging --standalone --agree-tos --preferred-challenges http --register-unsafely-without-email --renew-by-default -d $DOMAIN
RC=$?

if [[ ! -z $DRY ]]; then
  echo "Let's encrypt dry run."
elif [[ $RC == 0 ]]; then
  echo "Staging trial worked getting offical certs now."
  certbot certonly --standalone --agree-tos --preferred-challenges http --register-unsafely-without-email --renew-by-default -d $DOMAIN
  certbot renew --dry-run

  echo "Symlink certs for Video-Sync"
  CERT="$(sudo certbot certificates | grep 'Certificate Path:' | cut -d: -f2)"
  KEY="$(sudo certbot certificates | grep 'Private Key Path:' | cut -d: -f2)"
  rm /etc/video-sync/certificate.crt
  rm /etc/video-sync/certificate.key
  ln -s $CERT /etc/video-sync/certificate.crt
  ln -s $KEY /etc/video-sync/certificate.key
else
  echo "Let's  encrypt failed staging call"
  exit 1
fi
