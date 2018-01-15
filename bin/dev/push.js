'use strict';

const {exec, version} = require('../../src/lib');

exec('docker push newtoncodes/vpn');
exec('docker push newtoncodes/vpn:' + version);

console.log('Done.');
process.exit(0);