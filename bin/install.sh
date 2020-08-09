#!/usr/bin/env bash

name="$(uname -s)"
case "${name}" in
    Linux*)  os=Linux;;
    Darwin*) os=Mac;;
    CYGWIN*) os=Cygwin;;
    MINGW*)  os=MinGw;;
    *)       os=Windows
esac

if [ "$os" = "Linux" ]; then

    sudo apt-get update
    sudo apt-get install -y apt-transport-https software-properties-common curl

    if [ ! -f "/usr/bin/docker" ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
        sudo apt-key fingerprint 0EBFCD88
        sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

        sudo apt-get update
        sudo apt-get install -y docker-ce
        sudo apt-cache madison docker-ce
    fi

    if [ ! -f "/usr/local/bin/docker-compose" ]; then
        sudo curl -L https://github.com/docker/compose/releases/download/1.26.2/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi

fi