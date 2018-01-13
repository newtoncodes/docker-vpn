'use strict';

const {exec, exists, unlink, askServerName} = require('../lib');

module.exports = {
    uninstall: async (...args) => {
        let name = await askServerName((args[0] || '').trim(), false);
    
        if (!exists('/var/lib/docker/volumes/vpn_' + name)) {
            throw new Error('Service with the name "' + name + '" does not exist.');
        }
    
        if (exists('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml')) {
            exec('docker-compose -f "' + '/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml' + '" down');
            unlink('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml');
            exec('docker network rm "vpn_' + name + '"');
        }
    
        exec('docker volume rm "vpn_' + name + '"');
    
        console.log('Service uninstalled.');
    }
};