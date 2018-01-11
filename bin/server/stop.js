'use strict';

const exists = require('fs').existsSync;
const unlink = require('fs').unlinkSync;
const exec = require('child_process').execSync;


module.exports = {
    stop: (name) => {
        if (!exists('/var/lib/docker/volumes/vpn_' + name)) {
            console.error('Service "' + name + '" does not exist.');
            process.exit(1);
        }
    
        if (!exists('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml')) {
            console.error('Not started yet.');
            process.exit(1);
        }
    
        console.log('Stopping ' + name + '...');
        
        exec('docker-compose -f "' + '/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml' + '" down', {stdio: 'inherit'});
        unlink('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml');
    
        exec('docker network rm "vpn_' + name + '"');
    }
};