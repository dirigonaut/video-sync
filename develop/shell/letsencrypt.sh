#!/bin/bash
DOMAIN=$1

sudo apt-get update
sudo apt-get install software-properties-common
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
sudo apt-get install certbot

sudo certbot certonly --staging --standalone --renew-by-default -d $DOMAIN

if [[ $? == 0 ]]; then
  echo "Staging trial worked getting offical certs now."
  sudo certbot certonly --standalone --renew-by-default -d $DOMAIN
  sudo certbot renew --dry-run
else
  echo "Let's  encrypt failed staging call"
  exit 1
fi
