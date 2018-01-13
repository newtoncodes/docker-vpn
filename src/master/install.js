'use strict';

const {exec, version, askServerName, exists} = require('../lib');


module.exports = {
    install: async (...args) => {
        let name = await askServerName((args[0] || '').trim(), false);
    
        if (!exists('/var/lib/docker/volumes/vpn_' + name)) {
            throw new Error('Service "' + name + '" already exists. Uninstall it first or change the name.');
        }
    
        try {
            exec('docker run -it --rm -v vpn_' + name + ':/vpn newtoncodes/vpn:' + version + ' /usr/local/bin/install');
        } catch (e) {
            exec('docker volume rm "vpn_' + name + '"');
        }
    
        console.log('Service installed.');
    }
};