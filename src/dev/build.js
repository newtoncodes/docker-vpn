'use strict';

const {exec, version} = require('../lib');

__dirname = __dirname.replace(/\\/g, '/');

exec('cd ' + __dirname + '/../../docker && docker build -t newtoncodes/vpn .');
exec('cd ' + __dirname + '/../../docker && docker build -t newtoncodes/vpn:' + version + ' .');

