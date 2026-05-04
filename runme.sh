#!/bin/bash 
set -e

sudo docker build -t my-forum .
sudo docker run -p 8000:8000 my-forum:latest
