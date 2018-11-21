#!/bin/bash
DOMAIN=$1
DRY=$2

sudo add-apt-repository ppa:certbot/certbot -y
sudo apt-get install certbot software-properties-common -y
sudo apt-get update

sudo certbot certonly --staging --standalone --renew-by-default -d $DOMAIN

if [[ ! -z $DRY ]]; then
  echo "Let's  encrypt dry run."
elif [[ $? == 0 ]]; then
  echo "Staging trial worked getting offical certs now."
  sudo certbot certonly --standalone --renew-by-default -d $DOMAIN
  sudo certbot renew --dry-run
else
  echo "Let's  encrypt failed staging call"
  exit 1
fi
