#!/usr/bin/env node

'use strict';

const exists = require('fs').existsSync;
const exec = require('child_process').execSync;
const yargs = require('yargs');

const install = require('./master/install').install;
const uninstall = require('./master/uninstall').uninstall;
const command = require('./server/command').command;
const start = require('./server/start').start;
const stop = require('./server/stop').stop;


const options = {
    server: {
        name: 'server',
        description: 'Server name/key.',
        type: 'string',
        
        coerce: (server) => {
            server = server.trim().toLowerCase();
            if (!server) throw new Error('Invalid server name.');
            
            if (!exists('/var/lib/docker/volumes/vpn_' + server)) {
                throw new Error('Server "' + server + '" does not exist.');
            }
            
            return server;
        }
    },
    
    client: {
        name: 'client',
        description: 'Client name/key.',
        type: 'string',
        
        coerce: (name) => {
            name = name.trim().toLowerCase();
            if (!name) throw new Error('Invalid client name.');
            
            return name;
        }
    },
    
    ip: {
        name: 'ip',
        description: 'Client IP address.',
        type: 'string',
        
        coerce: (ip) => {
            ip = ip.trim().toLowerCase();
    
            if (ip && !ip.match(/^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)) {
                throw new Error('Invalid client ip.');
            }
            
            return ip;
        }
    },
    
    config: {
        name: 'config',
        description: 'Config type.',
        type: 'string',
        choices: ['server', 'client', 'hosts', 'vars'],
        default: 'server'
    },
    
    save: {
        alias: 's',
        description: 'Save to file',
        type: 'string'
    }
};

const commands = {
    install: {
        command: 'install [server]',
        description: 'Install a new vpn service config.',
    
        builder: (yargs) => {
            return yargs
                .positional('server', Object.assign({}, options.server, {coerce: undefined}))
        },
    
        handler: (argv) => {
            install(argv.server);
        }
    },
    uninstall: {
        command: 'uninstall [server]',
        description: 'Uninstall a vpn service config.',
    
        builder: (yargs) => {
            return yargs
                .positional('server', options.server)
        },
    
        handler: (argv) => {
            uninstall(argv.server);
        }
    },
    start: {
        command: 'start <server>',
        description: 'Start a vpn service.',
    
        builder: (yargs) => {
            return yargs
                .positional('server', options.server)
        },
    
        handler: (argv) => {
            start(argv.server);
            process.exit();
        }
    },
    stop: {
        command: 'stop <server>',
        description: 'Stop a vpn service.',
    
        builder: (yargs) => {
            return yargs
                .positional('server', options.server)
        },
    
        handler: (argv) => {
            stop(argv.server);
            process.exit();
        }
    },
    restart: {
        command: 'restart <server>',
        description: 'Restart a vpn service.',
    
        builder: (yargs) => {
            return yargs
                .positional('server', options.server)
        },
    
        handler: (argv) => {
            stop(argv.server);
            start(argv.server);
            process.exit();
        }
    },
    config: {
        command: 'config <server> [type]',
        description: 'Edit one of the server configs.',
    
        builder: (yargs) => {
            return yargs
                .positional('server', options.server)
                .positional('type', options.config)
        },
    
        handler: (argv) => {
            command(argv.server, 'config', [argv.type]);
            process.exit();
        }
    },
    logs: {
        command: 'logs <server>',
        description: 'Follow the vpn log.',
    
        builder: (yargs) => {
            return yargs
                .positional('server', options.server)
        },
    
        handler: (argv) => {
            command(argv.server, 'logs');
            process.exit();
        }
    },
    status: {
        command: 'status <server>',
        description: 'Follow the vpn status.',
    
        builder: (yargs) => {
            return yargs
                .positional('server', options.server)
        },
    
        handler: (argv) => {
            command(argv.server, 'status');
            process.exit();
        }
    },
    clients: {
        command: 'clients <server>',
        description: 'List all clients.',
    
        builder: (yargs) => {
            return yargs
                .positional('server', options.server)
        },
    
        handler: (argv) => {
            command(argv.server, 'clients/list');
            process.exit();
        }
    },
    issue: {
        command: 'issue <server> [client] [ip] [-s <file>]',
        description: 'Issue a new client certificate and config.',
        
        builder: (yargs) => {
            return yargs
                .positional('server', options.server)
                .positional('client', options.client)
                .positional('ip', options.ip)
                .option('save', options.save)
        },
    
        handler: (argv) => {
            command(argv.server, 'clients/create', [argv.client, argv.ip, argv.save], () => process.exit());
        }
    },
    revoke: {
        command: 'revoke <server> [client]',
        description: 'Revoke a client certificate.',
        
        builder: (yargs) => {
            return yargs
                .positional('server', options.server)
                .positional('client', options.client)
        },
        
        handler: (argv) => {
            command(argv.server, 'clients/revoke', [argv.client], () => {
                console.log('Because of an unknown reason, the server has to be restarted for the CRL to take effect.');
                console.log('Server will restart now...');
                
                stop(argv.server);
                start(argv.server);
                process.exit();
            });
        }
    },
    dependencies: {
        command: 'install-dependencies',
        description: 'Install dependencies (Ubuntu/Debian).',
        
        builder: (yargs) => yargs,
        
        handler: () => {
            exec('bash ' + __dirname + '/install.sh', {stdio: 'inherit'});
            process.exit(0);
        }
    }
};


yargs
    .wrap(null)
    .usage('Docker-based openvpn server with dnsmasq.\n\nUsage: $0 <cmd> <args ...>')
    .demandCommand(1, 1, 'You must specify a command.', 'You must specify max one command.')
    .command(commands['install'])
    .command(commands['uninstall'])
    .command(commands['start'])
    .command(commands['stop'])
    .command(commands['restart'])
    .command(commands['config'])
    .command(commands['logs'])
    .command(commands['status'])
    .command(commands['clients'])
    .command(commands['issue'])
    .command(commands['revoke'])
    .command(commands['dependencies'])
    .help();

if (!commands[yargs.argv['_'][0]]) {
    yargs.showHelp('log');
    process.exit();
}
