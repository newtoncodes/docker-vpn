'use strict';

const {exec, exists, unlink, getVars,  version, writeFile} = require('../lib');


module.exports = {
    start: async (name) => {
        if (!exists('/var/lib/docker/volumes/vpn_' + name)) {
            throw new Error('Service "' + name + '" does not exist.');
        }
    
        if (exists('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml')) {
            throw new Error('Already started.');
        }
    
        console.log('Starting ' + name + '...');
    
        exec('docker network create "vpn_' + name + '"');
    
        try {
            let config = getVars(name);
            let yml = 'version: \'3\'\n' +
                '\n' +
                'volumes:\n' +
                '  vpn_'+ name + ':\n' +
                '    external: true\n' +
                '\n' +
                'networks:\n' +
                '  vpn_'+ name + ':\n' +
                '    external: true\n' +
                '\n' +
                'services:\n' +
                '  vpn_'+ name + ':\n' +
                '    image: newtoncodes/vpn:' + version + '\n' +
                '    container_name: vpn_'+ name + '\n' +
                '    cap_add:\n' +
                '     - NET_ADMIN\n' +
                '    ports:\n' +
                '     - "' + config['PORT'] + ':1194/' + config['PROTOCOL'] + '"\n' +
                '    environment:\n' +
                '     - PROTOCOL=' + config['PROTOCOL'] + '\n' +
                '     - PORT=' + config['PORT'] + '\n' +
                '    restart: always\n' +
                '    privileged: true\n' +
                '    networks:\n' +
                '     - vpn_'+ name + '\n' +
                '    volumes:\n' +
                '     - vpn_'+ name + ':/vpn\n'
            ;
            
            writeFile('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml', yml, 'utf8');
        } catch (e) {
            exec('docker network rm "vpn_' + name + '"');
            return;
        }
    
        try {
            exec('docker-compose -f "' + '/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml' + '" up -d');
        } catch (e) {
            unlink('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml');
            exec('docker network rm "vpn_' + name + '"');
        }
    }
};