# VPN server

Docker based vpn openvpn server with dnsmasq.

The idea here is to make vpn server install and management easy to use on top of docker.
Docker is not required to run openvpn, but it makes encapsulation easier if we want to have multiple networks on one host.
Also comes with built-in dnsmasq server, that makes your life easier when you want to set up internal domain names for the office or in similar use cases.

## Notes

* Works only on **linux hosts**.
* Uses **/var/lib/docker/volumes** to add files to the vpn volumes

## Usage

```
Usage: vpn <cmd> <args ...>
   
Commands:
  vpn install [server]                          Install a new vpn service config.
  vpn uninstall [server]                        Uninstall a vpn service config.
  vpn start <server>                            Start a vpn service.
  vpn stop <server>                             Stop a vpn service.
  vpn restart <server>                          Restart a vpn service.
  vpn config <server> [type]                    Edit one of the server configs.
  vpn logs <server>                             Follow the vpn log.
  vpn status <server>                           Follow the vpn status.
  vpn clients <server>                          List all clients.
  vpn issue <server> [client] [ip] [-s <file>]  Issue a new client certificate and config.
  vpn revoke <server> [client]                  Revoke a client certificate.
  vpn install-dependencies                      Install dependencies (Ubuntu/Debian).
  
Options:
  --version  Show version number  [boolean]
  --help     Show help  [boolean]
```

**The docker image can be used standalone.**

**The vpn command has an alias docker-vpn, if the word vpn is already in use**

The npm package makes it easy to use it all without having to remember commands.

## Install node

```bash
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -; sudo apt-get install -y nodejs
```

## Install docker-vpn

```bash
npm install docker-vpn
vpn --help # If the vpn command is busy, use docker-vpn
```

For Ubuntu/Debian distributions:

```bash
vpn install-dependencies
```

For other distributions you will need to install:

```bash
curl
docker-ce/ee
docker-compose
```

## Known issues

* Revoking clients requires restart. Not sure why, it must not behave this way, but...
* Windows users have to remove the linux lines at the end of the config file.

## TODO

* Install scripts for other linux distros
* Autocomplete commands when double tab is pressed

