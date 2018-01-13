'use strict';

const {exec, version} = require('../lib');

require('./build');

exec('docker push newtoncodes/vpn');
exec('docker push newtoncodes/vpn:' + version);
