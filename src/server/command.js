'use strict';

const {exec, isWritable, version, writeFile, askClientName, askClientIp, vpnExists} = require('../lib');

const spawnAsync = require('child_process').spawn;


module.exports = {
    command: async (name, cmd, args) => {
        if (!vpnExists(name)) throw new Error('Service "' + name + '" does not exist.');
        
        if (cmd === 'clients/create') {
            let client = await askClientName((args[0] || '').trim(), false);
            let ip = await askClientIp((args[1] || '').trim(), true);
            
            let file = args[2] || null;
    
            args = [client];
            if (ip) args.push(ip);
    
            args = (args || []).map(function (s) {return (s || '').trim()});
    
            if (file && !isWritable(file)) {
                throw new Error('Output file is not writable.');
            }
        
            return new Promise((resolve, reject) => {
                let stdout = '';
                let buffer = '';
                let came = false;
    
                let ps = spawnAsync(
                    'docker',
                    ['run', '-it', '--rm', '-v', 'vpn_' + name + ':/vpn', 'newtoncodes/vpn:' + version, '/usr/local/bin/' + cmd].concat(args),
                    {stdio: ['inherit', 'pipe', 'inherit']}
                );
    
                ps.stdout.on('data', (data) => {
                    let m = data['toString']('utf8');
                    stdout += m;
                    buffer += m;
        
                    let s = buffer.split('\n');
        
                    while (s.length > 1) {
                        let t = s.shift();
            
                        if (t.indexOf('#----BEGIN CONFIG----#') !== -1) came = true;
                        if (!file || !came) process.stdout.write(t + '\n');
                    }
        
                    if (s[0].indexOf('#') === -1) {
                        if (!file || !came) process.stdout.write(s[0]);
                        buffer = '';
                    } else {
                        buffer = s[0] || '';
                    }
                });
    
                ps.on('close', (code) => {
                    if (buffer && (!file || !came)) process.stdout.write(buffer + '\n');
        
                    if (code !== 0) {
                        return reject(new Error(''));
                    }
        
                    if (file) {
                        let config = stdout.split('#----BEGIN CONFIG----#');
                        if (config.length !== 2) {
                            return reject(new Error('Unknown command response.'));
                        }
            
                        config = config[1].split('#----END CONFIG----#')[0];
                        config = config.trim() + '\n';
            
                        writeFile(file, config, 'utf8');
                    }
        
                    resolve();
                });
            });
        }
    
        if (cmd === 'clients/revoke') {
            let client = await askClientName((args[0] || '').trim(), false);
    
            try {
                exec('docker run -it --rm -v vpn_' + name + ':/vpn newtoncodes/vpn:' + version + ' /usr/local/bin/' + cmd + ' ' + client);
            } catch (e) {
                throw new Error('Command: ' + cmd + ' failed.');
            }
    
            console.log('Because of an unknown reason, the server has to be restarted for the CRL to take effect.');
            console.log('Server will restart now...');
    
            return;
        }
    
        args = (args || []).map(function (s) {return '"' + (s || '').trim().replace(/"/g, '\\"') + '"'}).join(' ');
    
        try {
            exec('docker run -it --rm -v vpn_' + name + ':/vpn newtoncodes/vpn:' + version + ' /usr/local/bin/' + cmd + ' ' + args);
        } catch (e) {
            throw new Error('Command: ' + cmd + ' failed.');
        }
    }
};
