#!/usr/bin/env node

'use strict';

const exists = require('fs').existsSync;
const exec = require('child_process').execSync;
const yargs = require('yargs');

const install = require('../src/master/install').install;
const uninstall = require('../src/master/uninstall').uninstall;
const iptables = require('../src/master/iptables').iptables;
const command = require('../src/server/command').command;
const start = require('../src/server/start').start;
const stop = require('../src/server/stop').stop;


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
    },
    
    interface: {
        alias: 'i',
        description: 'Public network interface to allow.',
        type: 'string'
    }
};

const resolve = (promise, cb = () => process.exit(0)) => {
    return promise.then(cb).catch(e => {
        console.error('Error: ' + e.message);
        process.exit(1);
    });
};


const commands = {
    install: {
        command: 'install [server]',
        description: 'Install a new vpn service config.',
    
        builder: (yargs) => yargs
            .positional('server', Object.assign({}, options.server, {coerce: undefined})),
    
        handler: (argv) => resolve(install(argv.server))
    },
    uninstall: {
        command: 'uninstall [server]',
        description: 'Uninstall a vpn service config.',
    
        builder: (yargs) => yargs
            .positional('server', options.server),
    
        handler: (argv) => resolve(uninstall(argv.server))
    },
    start: {
        command: 'start <server>',
        description: 'Start a vpn service.',
    
        builder: (yargs) => yargs
            .positional('server', options.server),
    
        handler: (argv) => resolve(start(argv.server))
    },
    stop: {
        command: 'stop <server>',
        description: 'Stop a vpn service.',
    
        builder: (yargs) => yargs
            .positional('server', options.server),
    
        handler: (argv) => resolve(stop(argv.server))
    },
    restart: {
        command: 'restart <server>',
        description: 'Restart a vpn service.',
    
        builder: (yargs) => yargs
            .positional('server', options.server),
    
        handler: (argv) => resolve(stop(argv.server), () => resolve(start(argv.server)))
    },
    config: {
        command: 'config <server> [type]',
        description: 'Edit one of the server configs.',
    
        builder: (yargs) => yargs
            .positional('server', options.server)
            .positional('type', options.config),
    
        handler: (argv) => resolve(command(argv.server, 'config', [argv.type]))
    },
    logs: {
        command: 'logs <server>',
        description: 'Follow the vpn log.',
    
        builder: (yargs) => yargs
            .positional('server', options.server),
    
        handler: (argv) => resolve(command(argv.server, 'logs'))
    },
    status: {
        command: 'status <server>',
        description: 'Follow the vpn status.',
    
        builder: (yargs) => yargs
            .positional('server', options.server),
    
        handler: (argv) => resolve(command(argv.server, 'status'))
    },
    clients: {
        command: 'clients <server>',
        description: 'List all clients.',
    
        builder: (yargs) => yargs
            .positional('server', options.server),
    
        handler: (argv) => resolve(command(argv.server, 'clients/list'))
    },
    issue: {
        command: 'issue <server> [client] [ip] [-s <file>]',
        description: 'Issue a new client certificate and config.',
        
        builder: (yargs) => yargs
            .positional('server', options.server)
            .positional('client', options.client)
            .positional('ip', options.ip)
            .option('save', options.save),
    
        handler: (argv) => resolve(command(argv.server, 'clients/create', [argv.client, argv.ip, argv.save]))
    },
    revoke: {
        command: 'revoke <server> [client]',
        description: 'Revoke a client certificate.',
        
        builder: (yargs) => yargs
            .positional('server', options.server)
            .positional('client', options.client),
        
        handler: (argv) => resolve(command(argv.server, 'clients/revoke', [argv.client]), () => {
            resolve(stop(argv.server, () => resolve(start(argv.server))));
        })
    },
    iptables: {
        command: 'iptables [-i <interface>] [-s <file>]',
        description: 'Print all iptables accept rules.',
        
        builder: (yargs) => yargs
            .positional('interface', options.interface)
            .positional('save', options.save),
        
        handler: (argv) => resolve(iptables(argv.interface, argv.save))
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
