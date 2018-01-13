'use strict';

const mkdir = require('fs').mkdirSync;
const exists = require('fs').existsSync;
const readFile = require('fs').readFileSync;
const writeFile = require('fs').writeFileSync;
const unlink = require('fs').unlinkSync;
const exec = require('child_process').execSync;
const version = require('../package.json').version;
const readInput = require('read-input');
const dotenv = require('dotenv');
const readline = require('readline');
const W_OK = require('fs').W_OK;
const access = require('fs').accessSync;
const dirname = require('path').dirname;
readline.rli = readline.rli || readline.createInterface({input: process.stdin, output: process.stdout});
const ask = require('util').promisify((q, c) => readline.rli.question(q, a => c(null, a)));

let interfaces = [];
let ni = require('os').networkInterfaces();
for (let i in ni) {
    if (i === 'lo' || i.match(/^tun\d+$/)) continue;
    interfaces.push(i);
}


module.exports = {
    getVolumePath: v => '/var/lib/docker/volumes/vpn_' + v,
    getYmlPath: v => '/var/lib/docker/volumes/vpn_' + v + '/_data/service.yml',
    getVarsPath: v => '/var/lib/docker/volumes/vpn_' + v + '/_data/config/vars.env',
    
    getVars: (name) => {
        if (!this.vpnExists(name)) throw new Error('Configs not installed. Please run install first.');
        return dotenv.parse(readFile(this.getVarsPath(name)));
    },
    
    vpnExists: (v) => exists(this.getVarsPath(v)),
    
    ask: async (question, validate, initial) => {
        if (initial !== undefined && validate(initial)) return initial;
        
        let a = null;
        while (a === null || !validate(a)) a = ((await ask(question)) || '').trim();
        return a;
    },
    
    askServerName: async (initial, allowNull) => {
        return await this.ask('Enter the server\'s name: ', n => {
            if (!n && allowNull) return true;
            if (!n) return false;
            return !!n;
        }, initial);
    },
    
    askClientName: async (initial, allowNull) => {
        return await this.ask('Enter the client\'s name: ', n => {
            if (!n && allowNull) return true;
            if (!n) return false;
            return !!n;
        }, initial);
    },
    
    askClientIp: async (initial, allowNull) => {
        return await this.ask('Enter the client\'s ip' + (allowNull ? ' (leave empty for default)' : '') + ': ', n => {
            if (!n && allowNull) return true;
            if (!n) return false;
            return !(n && !n.match(/^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/));
        }, initial);
    },
    
    askIface: async (initial) => {
        return await this.ask('Please enter the public interface to use.\nOptions: ' + interfaces.join(', ') + ':\n', n => {
            return (n && interfaces.includes(n));
        }, initial);
    },
    
    readInput: async () => {
        return (await readInput([])).data;
    },
    
    isWritable: (file) => {
        try {
            if (exists(file)) access(file, W_OK);
            else access(dirname(file), W_OK);
        } catch (e) {
            return false;
        }
        
        return true;
    },
    
    dotenv,
    
    readFile,
    writeFile,
    exists,
    mkdir,
    unlink,
    
    version,
    interfaces,
    
    /**
     * @param {string} cmd
     * @return {string}
     */
    exec: (cmd) => exec(cmd, {stdio: 'inherit'}).toString('utf8'),
};