#!/bin/bash
EXAMPLE_1=$1

sudo apt-get update
sudo apt-get install software-properties-common
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
sudo apt-get install certbot

sudo certbot certonly --standalone --renew-by-default -d $EXAMPLE_1
sudo certbot renew --dry-run
