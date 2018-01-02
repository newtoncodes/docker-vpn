# VPN

VPN server setup with docker with preconfigured scripts

#### Links

Docker image used: https://github.com/kylemanna/docker-openvpn

## Install

```bash
apt-get install -y git
git clone https://github.com/newtoncodes/vpn.git ~/vpn-installer
bash ~/vpn-installer/install
```

## Usage

After installation, all scripts are added to /vpn/$NAME/* and you can check them with double tab.

There is no added functionality to the original docker image, just the ability to add and manage multiple VPN servers on one host without thinking too much and remembering commands.

**dnsmasq** is used to forward the DNS traffic and allow setting custom internal hosts with /etc/hosts.

