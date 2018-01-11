'use strict';

const spawnAsync = require('child_process').spawn;
const exec = require('child_process').execSync;
const writeFile = require('fs').writeFileSync;
const exists = require('fs').existsSync;
const W_OK = require('fs').W_OK;
const access = require('fs').accessSync;
const dirname = require('path').dirname;

const version = require('../../package.json').version;
const readline = require('readline');
const rl = readline.rli || readline.createInterface({input: process.stdin, output: process.stdout});
readline.rli = rl;

let client = null;
let ip = null;

const askName = (callback) => {
    if (client) return callback();
    
    rl.question('Enter the client\'s name: ', (n) => {
        n = (n || '').trim();
        if (!n) return askName(callback);
        
        client = n;
        callback();
    });
};

const askIp = (callback) => {
    if (ip) return callback();
    
    rl.question('Enter the client\'s ip (leave empty for default): ', (n) => {
        n = (n || '').trim();
        if (n && !n.match(/^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)) return askIp(callback);
        
        ip = n;
        callback();
    });
};

module.exports = {
    command: (name, cmd, args, callback) => {
        if (cmd === 'clients/create') {
            client = args[0] || null;
            ip = args[1] || null;
            let file = args[2] || null;
        
            askName(() => {
                askIp(() => {
                    args = [client];
                    if (ip) args.push(ip);
                
                    args = (args || []).map(function (s) {return (s || '').trim()});
                    
                    if (file) {
                        try {
                            if (exists(file)) access(file, W_OK);
                            else access(dirname(file), W_OK);
                        } catch (e) {
                            console.error('Output file is not writable.');
                            process.exit(1);
                        }
                    }
                    
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
                            console.log('');
                            process.exit(1);
                        }
    
                        if (file) {
                            let config = stdout.split('#----BEGIN CONFIG----#');
                            if (config.length !== 2) {
                                console.error('Unknown command response.');
                                process.exit(1);
                            }
        
                            config = config[1].split('#----END CONFIG----#')[0];
                            config = config.trim() + '\n';
        
                            writeFile(file, config, 'utf8');
                        }
    
                        callback && callback();
                    });
                });
            });
        
            return;
        }
    
        if (cmd === 'clients/revoke') {
            client = args[0] || null;
            ip = args[1] || null;
        
            askName(() => {
                try {
                    exec(
                        'docker run -it --rm -v vpn_' + name + ':/vpn newtoncodes/vpn:' + version + ' /usr/local/bin/' + cmd + ' ' + client,
                        {stdio: 'inherit'}
                    );
                } catch (e) {
                    console.log('');
                    process.exit(1);
                }
            
                callback && callback();
            });
        
            return;
        }
    
        args = (args || []).map(function (s) {return '"' + (s || '').trim().replace(/"/g, '\\"') + '"'}).join(' ');
    
        try {
            exec(
                'docker run -it --rm -v vpn_' + name + ':/vpn newtoncodes/vpn:' + version + ' /usr/local/bin/' + cmd + ' ' + args,
                {stdio: 'inherit'}
            );
        } catch (e) {
            // Just add an empty line.
            console.log('');
            process.exit(1);
        }
    
        callback && callback();
    }
};
