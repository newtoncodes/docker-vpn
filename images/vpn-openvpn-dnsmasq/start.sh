#!/usr/bin/env sh

touch /etc/openvpn/hosts

dnsmasq --no-hosts --addn-hosts=/etc/openvpn/hosts

ovpn_run
