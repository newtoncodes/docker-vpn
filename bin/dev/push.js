'use strict';

const exec = require('child_process').execSync;
const version = require('../../package.json').version;


require('./build');

exec('docker push newtoncodes/vpn', {stdio: 'inherit'});
exec('docker push newtoncodes/vpn:' + version, {stdio: 'inherit'});
