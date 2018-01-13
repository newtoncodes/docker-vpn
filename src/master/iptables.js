'use strict';

const {exists, writeFile, getVars, askIface} = require('../lib');
const interfaces = require('../lib').interfaces;
const exec = require('../lib').exec;


const iptables = (volumes, iface) => {
    let rule = '';
    
    for (let v of volumes) {
        let vars = getVars(v);
        let protocol = (vars['PROTOCOL'] || 'tcp').toLowerCase();
        let port = parseInt(vars['PORT'] || 1194);
        
        rule += `
iptables -A INPUT  --dport ${port} -p ${protocol} -i ${iface} -m state --state NEW,ESTABLISHED -j ACCEPT
iptables -A OUTPUT --sport ${port} -p ${protocol} -i ${iface} -m state --state ESTABLISHED     -j ACCEPT
`;
    }
    
    return rule;
};


module.exports = {
    iptables: async (iface, file) => {
        let ls = exec('docker volume ls');
        ls = (ls || '').trim();
        
        if (ls.indexOf('DRIVER') !== -1) {
            console.log('');
            return;
        }
        
        let volumes = ls.split('\n').map(r => r.split(/s+/)[1].trim()).slice(1).filter(v => v.indexOf('vpn_') === 0).filter(v => {
            return exists('/var/lib/docker/volumes/' + v + '/_data/config/vars.env');
        });
        
        if (!interfaces.length) {
            throw new Error('No active network interfaces found.');
        }
    
        if (!iface && interfaces.length === 1) iface = interfaces[0];
        if (iface) {
            if (!interfaces.includes(iface)) {
                throw new Error('Network interface ' + iface + ' not found.');
            }
            
            let result = iptables(volumes, iface);
            if (file) writeFile(file, result);
            console.log(result);
            
            return;
        }
    
        return new Promise(resolve => askIface(iface => {
            let result = iptables(volumes, iface);
            if (file) writeFile(file, result);
            console.log(result);
            
            resolve();
        }));
    }
};