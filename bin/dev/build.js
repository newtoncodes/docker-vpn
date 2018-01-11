'use strict';

const exec = require('child_process').execSync;
const version = require('../../package.json').version;

__dirname = __dirname.replace(/\\/g, '/');

exec('cd ' + __dirname + '/../../docker && docker build -t newtoncodes/vpn .', {stdio: 'inherit'});
exec('cd ' + __dirname + '/../../docker && docker build -t newtoncodes/vpn:' + version + ' .', {stdio: 'inherit'});

