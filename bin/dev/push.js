'use strict';

const exec = require('child_process').execSync;
const version = require('../../package.json').version;

require('./build');

exec('docker publish newtoncodes/openvpn-dnsmasq', {stdio: 'inherit'});
exec('docker publish newtoncodes/openvpn-dnsmasq:' + version, {stdio: 'inherit'});
