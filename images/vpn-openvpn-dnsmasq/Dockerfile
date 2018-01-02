FROM kylemanna/openvpn:latest
#2.4

RUN apk update
RUN apk add dnsmasq

COPY start.sh /
RUN chmod +x /start.sh

CMD ["sh", "-l", "/start.sh"]
