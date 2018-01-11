'use strict';

const readline = require('readline');
const exists = require('fs').existsSync;
const unlink = require('fs').unlinkSync;
const exec = require('child_process').execSync;
const rl = readline.rli || readline.createInterface({input: process.stdin, output: process.stdout});
readline.rli = rl;

let name = null;

const askName = (callback) => {
    if (name) return callback();
    
    rl.question('Enter the server\'s name: ', function (n) {
        n = (n || '').trim();
        if (!n) return askName(callback);
        
        name = n;
        callback();
    });
};


module.exports = {
    uninstall: (...args) => {
        name = (args[0] || '').trim();
        
        askName(() => {
            rl.close();
    
            if (!exists('/var/lib/docker/volumes/vpn_' + name)) {
                console.error('Service with the name "' + name + '" does not exist.');
                process.exit(1);
            }
    
            if (exists('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml')) {
                exec('docker-compose -f "' + '/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml' + '" down', {stdio: 'inherit'});
                unlink('/var/lib/docker/volumes/vpn_' + name + '/_data/service.yml');
                exec('docker network rm "vpn_' + name + '"');
            }
    
            exec('docker volume rm "vpn_' + name + '"', {stdio: 'inherit'});
            
            console.log('Service uninstalled.');
        });
    }
};