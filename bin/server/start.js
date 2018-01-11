'use strict';

const dotenv = require('dotenv');
const exists = require('fs').existsSync;
const writeFile = require('fs').writeFileSync;
const readFile = require('fs').readFileSync;
const unlink = require('fs').unlinkSync;
const exec = require('child_process').execSync;
const version = require('../../package.json').version;

const getVars = (name) => {
    if (!exists('/var/lib/docker/volumes/vpn_' + name + '/_data/config/vars.env')) {
        console.error('Configs not installed. Please run install first.');
        process.exit(1);
    }
    
    return dotenv.parse(readFile('/var/lib/docker/volumes/vpn_' + name + '/_data/config/vars.env'));
};


module.exports = {
    start: (name) => {
        if (!exists('/var/lib/docker/volumes/vpn_' + name)) {
            console.error('Service "' + name + '" does not exist.');
            process.exit(1);
        }
    
        if (exists('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml')) {
            console.error('Already started.');
            process.exit(1);
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
            exec('docker-compose -f "' + '/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml' + '" up -d', {stdio: 'inherit'});
        } catch (e) {
            unlink('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml');
            exec('docker network rm "vpn_' + name + '"');
        }
    }
};