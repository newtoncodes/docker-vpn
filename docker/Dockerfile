FROM alpine:latest

RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing/" >> /etc/apk/repositories && \
    apk add --update nano openvpn iptables bash easy-rsa openvpn-auth-pam dnsmasq gcc g++ make git curl wget unzip curl curl-dev && \
    ln -s /usr/share/easy-rsa/easyrsa /usr/local/bin && \
    rm -rf /tmp/* /var/tmp/* /var/cache/apk/* /var/cache/distfiles/*

RUN wget https://codeload.github.com/authy/authy-openvpn/zip/master
RUN mv master master.zip
RUN unzip master.zip
RUN cd authy-openvpn-master && make install

ENV EASYRSA /usr/share/easy-rsa
ENV EASYRSA_PKI /vpn/pki
ENV EASYRSA_VARS_FILE /vpn/vars
ENV EASYRSA_CRL_DAYS 3650
ENV EASYRSA_REQ_CN ""

RUN mkdir -p /usr/local/lib

COPY ./bin /usr/local/bin
COPY ./lib /usr/local/lib

RUN chmod -R a+x /usr/local/bin/*

EXPOSE 1194/udp
EXPOSE 1194/tcp
VOLUME ["/vpn"]

CMD ["run"]
