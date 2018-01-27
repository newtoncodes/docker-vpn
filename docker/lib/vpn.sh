#!/usr/bin/env bash

dir=$(dirname "$0")
vpnDir=/vpn

set -e # Fail if any of the commands fail

PROTOCOL=${PROTOCOL:-"tcp"}
PORT=${PORT:-1194}
HOST=""
SUBNET=""
DNS=""
REDIRECT=""
STATIC_IPS=""
SUBNET_MASK=""
SUBNET_IP=""

atoi() {
    IP=$1; IPNUM=0

    for (( i=0 ; i<4 ; ++i )); do
        ((IPNUM+=${IP%%.*}*$((256**$((3-${i}))))))
        IP=${IP#*.}
    done

    echo ${IPNUM}
}

itoa() {
    echo -n $(($(($(($((${1}/256))/256))/256))%256)).
    echo -n $(($(($((${1}/256))/256))%256)).
    echo -n $(($((${1}/256))%256)).
    echo $((${1}%256))
}

prefixToMask() {
    local prefix=$1;
    local shift=$(( 32 - prefix ));
    local mask=""

    for (( i=0; i < 32; i++ )); do
        num=0
        if [ ${i} -lt ${prefix} ]; then
            num=1
        fi

        space=
        if [ $(( i % 8 )) -eq 0 ]; then
            space=" ";
        fi

        mask="${mask}${space}${num}"
    done

    echo ${mask};
}

bitMaskToWildcard() {
    local mask=$1;
    local wildcard=""
    for octet in ${mask}; do
        wildcard="${wildcard} $(( 255 - 2#$octet ))"
    done

    echo ${wildcard};
}

cidr2mask() {
    local i
    local mask=""
    local cidr=${1#*/}
    local full_octets=$(($cidr/8))
    local partial_octet=$(($cidr%8))

    for ((i=0;i<4;i+=1)); do
        if [ ${i} -lt ${full_octets} ]; then
            mask+=255
        elif [ ${i} -eq ${full_octets} ]; then
            mask+=$((256 - 2**(8-$partial_octet)))
        else
            mask+=0
        fi
        [ ${i} -lt 3 ] && mask+=.
    done

    echo "$mask"
}

if [ -f ${vpnDir}/config/vars.env ]; then
    source ${vpnDir}/config/vars.env

    PROTOCOL=${PROTOCOL:-"udp"}
    PORT=${PORT:-"1194"}
    HOST=${HOST:-"0.0.0.0"}
    SUBNET=${SUBNET:-"10.8.0.0/24"}
    DNS=${DNS:-"10.8.0.1"}
    REDIRECT=${REDIRECT:-0}
    STATIC_IPS=${STATIC_IPS:-0}

    [[ ! "$SUBNET" =~ ^.*/[0-9]+$ ]] && SUBNET="$SUBNET/24"
    SUBNET_MASK=$(cidr2mask ${SUBNET})
    SUBNET_IP=$(echo "$SUBNET" | sed 's|/.*||g')
fi

nextIp() {
    local max="$1"
    local maxI=$(atoi "$max")

    if [ ! -f /vpn/ip-next.txt ]; then
        # local i=$(atoi "$SUBNET_IP")
        # i=$((${i} + 1))
        # i=$(itoa "$i")
        # echo "$i" > /vpn/ip-next.txt

        echo "$SUBNET_IP" > /vpn/ip-next.txt
    fi

    local next=$(cat /vpn/ip-next.txt)

    if [ "$next" = "" ]; then
        next="$SUBNET_IP"
    fi

    next=$(atoi "$next")

    local rolls=0
    while true; do
        next=$((${next} + 1))

        if [ "$maxI" -lt "$next" ]; then
            next=$(atoi "$SUBNET_IP")
            rolls+=1

            if [ ${rolls} -gt 1 ]; then
                break
            else
                continue
            fi
        fi

        if [ -f /vpn/pki/ips/$(itoa "$next") ]; then
            continue
        fi

        break
    done

    next=$(itoa "$next")
    echo "$next" > /vpn/ip-next.txt

    if [ "$next" = "$SUBNET_IP" ]; then
        next=""
    fi;

    echo "$next"
}

maxIp() {
    net=$(echo "$1" | cut -d '/' -f 1);
    prefix=$(echo "$1" | cut -d '/' -f 2);

    mask=$(prefixToMask "$prefix");
    wildcard=$(bitMaskToWildcard "$mask");

    str=
    for (( i = 1; i <= 4; i++ )); do
        range=$(echo ${net} | cut -d '.' -f ${i})
        mask_octet=$(echo ${wildcard} | cut -d ' ' -f ${i})

        if [ ${mask_octet} -gt 0 ]; then
            range="$(( $range | $mask_octet ))";
        fi
        str="${str} $range"
    done

    ips=$(echo ${str} | sed "s, ,\\.,g");
    ips=$(atoi "$ips")
    ips=$((${ips} - 2))
    ips=$(itoa "$ips")

    echo "$ips"
}

install() {
    local path=$(pwd)

    mkdir -p /vpn/config
    mkdir -p /vpn/log
    mkdir -p /vpn/ccd

    echo "Host name/address:"
    read HOST
    if [ "$HOST" = "" ]; then
        echo "Please provide a hostname or ip address."
        exit 1;
    fi

    echo "Protocol (default: tcp):"
    read PROTOCOL
    if [ "$PROTOCOL" != "udp" ] && [ "$PROTOCOL" != "tcp" ]; then PROTOCOL="tcp"; fi

    echo "Port (default: 1194):"
    read PORT
    if [ "$PORT" = "" ]; then PORT="1194"; fi

    echo "Subnet (default: 10.8.0.0/24):"
    read SUBNET
    if [ "$SUBNET" = "" ]; then SUBNET="10.8.0.0/24"; fi

    echo "Client DNS (default: 10.8.0.1):"
    read DNS
    if [ "$DNS" = "" ]; then DNS="10.8.0.1"; fi

    echo "Tunnel traffic (default: no):"
    read REDIRECT
    if [ "$REDIRECT" = "y" ] || [ "$REDIRECT" = "yes" ] || [ "$REDIRECT" = "Y" ] || [ "$REDIRECT" = "YES" ]; then REDIRECT="1"
    else REDIRECT="0"
    fi

    echo "Static client ips (default: no):"
    read STATIC_IPS
    if [ "$STATIC_IPS" = "y" ] || [ "$STATIC_IPS" = "yes" ] || [ "$STATIC_IPS" = "Y" ] || [ "$STATIC_IPS" = "YES" ]; then STATIC_IPS="1"
    else STATIC_IPS="0"
    fi

    echo "Please edit the config files one by one, matching your requirements."

    echo "#!/bin/bash

# Main server variables.
# This config defines the top-level server config options.
# Every time something changes in this config, all clients have to be recreated.

# Example:

PROTOCOL=$PROTOCOL
PORT=$PORT
HOST=$HOST
SUBNET=$SUBNET
DNS=$DNS
REDIRECT=$REDIRECT
STATIC_IPS=$STATIC_IPS
" > /vpn/config/vars.env

    nano /vpn/config/vars.env
    source ${vpnDir}/config/vars.env

    [[ ! "$SUBNET" =~ ^.*/[0-9]+$ ]] && SUBNET="$SUBNET/24"
    SUBNET_MASK=$(cidr2mask ${SUBNET})
    SUBNET_IP=$(echo "$SUBNET" | sed 's|/.*||g')

    echo "# Dnsmasq hosts file.
# This file defines custom host names for all clients, using the dns server.

127.0.0.1 localhost
" > /vpn/config/hosts

    nano /vpn/config/hosts

    echo "# Openvpn server config.
# All system settings like remote, local, topology, etc... are already in the config template.
# Please only define the options that are environment-specific.

# Example:

client-to-client
duplicate-cn
keepalive 10 120
cipher AES-128-CBC
auth SHA256
comp-lzo no
" > /vpn/config/server.conf

    nano /vpn/config/server.conf

    echo "# Openvpn client config.
# All system settings like remote, local, topology, etc... are already in the config template.
# Please only define the options that are environment-specific.

# Example:

comp-lzo no
cipher AES-128-CBC
auth SHA256
" > /vpn/config/client.conf

    nano /vpn/config/client.conf

    touch /vpn/ip.txt

    echo "Initiating PKI..."
    EASYRSA_REQ_CN="$HOST" easyrsa init-pki

    mkdir -p /vpn/pki/clients
    mkdir -p /vpn/pki/ips
    cd /vpn/pki

    echo "Building CA..."
    EASYRSA_REQ_CN="$HOST" EASYRSA_BATCH="yes" easyrsa build-ca

    echo "Generating DH..."
    easyrsa gen-dh

    echo "Generating TA..."
    openvpn --genkey --secret /vpn/pki/ta.key

    echo "Building server..."
    easyrsa build-server-full ${HOST} nopass

    echo "Generating CRL..."
    easyrsa gen-crl

    chown -R nobody:nogroup /vpn/pki/crl.pem
    chmod -R 755 /vpn/pki/crl.pem

    cd ${path}

    local max=$(maxIp ${SUBNET})
    touch /vpn/pki/ips/${SUBNET_IP}
    touch /vpn/pki/ips/$(nextIp ${max})
}

run() {
    if [ ! -d /vpn/pki ] || [ "$HOST" = "" ]; then
        echo "Please run install first."
        exit 1
    fi

    copyFiles
    createConfig

    mkdir -p /dev/net
    if [ ! -c /dev/net/tun ]; then
        mknod /dev/net/tun c 10 200
    fi

    if [ "$REDIRECT" == "1" ] ; then
        iptables -t nat -C POSTROUTING -s ${HOST} -o eth0 -j MASQUERADE || {
            iptables -t nat -A POSTROUTING -s ${HOST} -o eth0 -j MASQUERADE
        }

        iptables -t nat -C POSTROUTING -s 192.168.254.0/24 -o eth0 -j MASQUERADE || {
            iptables -t nat -A POSTROUTING -s 192.168.254.0/24 -o eth0 -j MASQUERADE
        }
    fi

    ip -6 route show default 2>/dev/null
    if [ $? = 0 ]; then
        sysctl -w net.ipv6.conf.all.disable_ipv6=0 || echo "Failed to enable IPv6 support"
        sysctl -w net.ipv6.conf.default.forwarding=1 || echo "Failed to enable IPv6 Forwarding default"
        sysctl -w net.ipv6.conf.all.forwarding=1 || echo "Failed to enable IPv6 Forwarding"
    fi

    dnsmasq --no-hosts --addn-hosts=/vpn/config/hosts
    exec openvpn --cd /etc/openvpn --script-security 2 --config /etc/openvpn/server.conf --writepid /run/openvpn.pid --client-config-dir /vpn/ccd --crl-verify /vpn/pki/crl.pem
}

copyFiles() {
    cat /vpn/pki/ca.crt > /etc/openvpn/ca.crt
    cat /vpn/pki/ta.key > /etc/openvpn/ta.key
    cat /vpn/pki/dh.pem > /etc/openvpn/dh.pem

    cat /vpn/pki/private/${HOST}.key > /etc/openvpn/server.key
    cat /vpn/pki/issued/${HOST}.crt > /etc/openvpn/server.crt

    chmod -R 755 /etc/openvpn/*

    chown -R nobody:nogroup /vpn/ip.txt
    chmod -R 755 /vpn/ip.txt
    chown -R nobody:nogroup /vpn/ccd
    chmod -R 755 /vpn/ccd
    chown -R nobody:nogroup /vpn/pki/crl.pem
    chmod -R 755 /vpn/pki/crl.pem
}

createConfig() {
    local config=$(cat /vpn/config/server.conf | sed ':a;N;$!ba;s/#[^\n]*//g' | sed ':a;N;$!ba;s/\n\n*/\n/g')

    local i=$(atoi "$SUBNET_IP")
    i=$((${i} + 1))
    local i2=$((${i} + 1))
    local serverIp=$(itoa "$i")
    local startIp=$(itoa "$i2")
    local endIp=$(maxIp "$SUBNET")

    echo "
local 0.0.0.0
port 1194
proto $PROTOCOL
dev tun

user nobody
group nogroup

persist-key
persist-tun

topology subnet
server $SUBNET_IP $SUBNET_MASK
route $SUBNET $SUBNET_MASK
ifconfig-pool-persist /vpn/ip.txt 0

ca /etc/openvpn/ca.crt
cert /etc/openvpn/server.crt
key /etc/openvpn/server.key
dh /etc/openvpn/dh.pem
tls-auth /etc/openvpn/ta.key 0

key-direction 0

$config

verb 3
status      /vpn/log/status.log
log         /vpn/log/current.log
log-append  /vpn/log/full.log
" > /etc/openvpn/server.conf
}

createClient() {
    local client="$1"
    local ip="$2"
    local nopass="$3"
    local path=$(pwd)
    local config=$(cat /vpn/config/client.conf | sed ':a;N;$!ba;s/#[^\n]*//g' | sed ':a;N;$!ba;s/\n\n*/\n/g')

    if [ "$client" = "" ]; then
        echo "Please provide a client name."
        exit 1
    fi

    if [ -f /vpn/pki/clients/${client} ]; then
        echo "Client \"$client\" exists."
        exit 1
    fi

    local max=$(maxIp ${SUBNET})

    if [ "$ip" = "" ] && [ "$STATIC_IPS" = "1" ]; then
        ip=$(nextIp ${max})

        if [ "$ip" = "" ]; then
            echo "Cannot allocate free ip."
            exit 1
        fi
    fi

    if [ "$ip" != "" ]; then
        if [ -f /vpn/pki/ips/${ip} ]; then
            echo "IP $ip is in use."
            exit 1
        fi

        if [ $(atoi ${ip}) -le 0 ]; then
            echo "IP $ip is in use."
            exit 1
        fi

        if [ $(atoi ${ip}) -gt $(atoi ${max}) ]; then
            echo "IP $ip is out of range."
            exit 1
        fi

        if [ $(atoi ${ip}) -le $(atoi ${SUBNET_IP}) ]; then
            echo "IP $ip is out of range."
            exit 1
        fi
    fi

    cd /vpn/pki

    echo "Building client..."
    easyrsa build-client-full ${client} ${nopass}

    if [ "$ip" != "" ]; then
        echo "ifconfig-push $ip $SUBNET_MASK" > /vpn/ccd/${client}
        chmod 755 /vpn/ccd/${client}
    fi

    cd ${path}

    local caCrt=$(cat /vpn/pki/ca.crt)
    local taKey=$(cat /vpn/pki/ta.key)
    local sslKey=$(cat /vpn/pki/private/${client}.key)
    local sslCrt=$(openssl x509 -in /vpn/pki/issued/${client}.crt)

    rm -f /vpn/pki/private/${client}.key
    rm -f /vpn/pki/reqs/${client}.req

    echo "$ip" > /vpn/pki/clients/${client}
    touch /vpn/pki/ips/${ip}

    local r
    if [ "$REDIRECT" = "1" ]; then r="redirect-gateway def1"
    else r=""
    fi

    echo "Client created."

    echo "
#----BEGIN CONFIG----#

client
dev tun

remote $HOST $PORT
proto $PROTOCOL
dhcp-option DNS $DNS
$r

nobind
auth-nocache

persist-key
persist-tun
resolv-retry infinite

remote-cert-tls server
key-direction 1

$config

verb 3

<ca>
$caCrt
</ca>
<cert>
$sslCrt
</cert>
<key>
$sslKey
</key>
<tls-auth>
$taKey
</tls-auth>

# Linux options
user nobody
group nogroup

# Linux DNS
up /etc/openvpn/update-resolv-conf
down /etc/openvpn/update-resolv-conf

#----END CONFIG----#
"
}

revokeClient() {
    local client="$1"
    local path=$(pwd)

    if [ "$client" = "" ]; then
        echo "Please provide a client name."
        exit 1
    fi

    cd /vpn/pki

    echo "Revoking certificate..."
    easyrsa revoke "$client"

    echo "Generating CRL..."
    easyrsa gen-crl

    chown -R nobody:nogroup /vpn/pki/crl.pem
    chmod -R 755 /vpn/pki/crl.pem

    cd ${path}

    local ip=$(cat /vpn/pki/clients/${client})

    rm -f /vpn/pki/clients/${client}
    rm -f /vpn/pki/issued/${client}.crt

    if [ "$ip" != "" ] && [ -f /vpn/pki/ips/${ip} ]; then
        rm -rf /vpn/pki/ips/${ip}
    fi

    echo "Client revoked."
}

listClients() {
    local path=$(pwd)
    cd /vpn/pki

    if [ -e crl.pem ]; then cat ca.crt crl.pem > cacheck.pem; fi

    echo -e "name\tbegin\tend\tstatus"
    for name in clients/*; do
        name=${name#clients/}

        begin=$(openssl x509 -noout -startdate -in issued/${name}.crt | awk -F= '{ print $2 }')
        end=$(openssl x509 -noout -enddate -in issued/${name}.crt | awk -F= '{ print $2 }')

        if [ "$name" != "$HOST" ]; then
            if [ -e crl.pem ]; then
                if openssl verify -crl_check -CAfile cacheck.pem issued/${name}.crt &> /dev/null; then status="VALID"
                else status="REVOKED"; fi
            else
                status="VALID"
            fi

            echo -e "$name\t$begin\t$end\t$status"
        fi
    done

    if [ -e crl.pem ]; then rm cacheck.pem; fi

    cd ${path}
}