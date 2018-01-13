'use strict';

const {exec, exists, unlink} = require('../lib');


module.exports = {
    stop: async (name) => {
        if (!exists('/var/lib/docker/volumes/vpn_' + name)) {
            throw new Error('Service "' + name + '" does not exist.');
        }
    
        if (!exists('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml')) {
            throw new Error('Not started yet.');
        }
    
        console.log('Stopping ' + name + '...');
        
        exec('docker-compose -f "' + '/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml' + '" down');
        unlink('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml');
    
        exec('docker network rm "vpn_' + name + '"');
    }
};