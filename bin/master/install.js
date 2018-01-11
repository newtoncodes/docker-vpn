'use strict';

const readline = require('readline');
const exists = require('fs').existsSync;
const exec = require('child_process').execSync;
const version = require('../../package.json').version;
const rl = readline.rli || readline.createInterface({input: process.stdin, output: process.stdout});
readline.rli = rl;

let name = null;

const askName = (callback) => {
    if (name) return callback();
    
    rl.question('Enter the server\'s name: ', (n) => {
        n = (n || '').trim();
        if (!n) return askName(callback);
        
        name = n;
        callback();
    });
};


module.exports = {
    install: (...args) => {
        name = (args[0] || '').trim();
        
        askName(() => {
            if (exists('/var/lib/docker/volumes/vpn_' + name)) {
                console.error('Service "' + name + '" already exists. Uninstall it first or change the name.');
                process.exit(1);
            }
    
            rl.close();
    
            try {
                exec(
                    'docker run -it --rm -v vpn_' + name + ':/vpn newtoncodes/vpn:' + version + ' /usr/local/bin/install',
                    {stdio: 'inherit'}
                );
            } catch (e) {
                exec('docker volume rm "vpn_' + name + '"', {stdio: 'inherit'});
            }
    
            console.log('Service installed.');
        });
    }
};