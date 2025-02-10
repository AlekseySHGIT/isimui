import { Service } from 'node-windows';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a new service object
const svc = new Service({
    name: 'ISIMUI',
    script: join(__dirname, 'server.js')
});

// Listen for uninstall events
svc.on('uninstall', () => {
    console.log('Service uninstalled successfully!');
});

svc.on('error', (err) => {
    console.error('Service error:', err);
});

// Uninstall the service
console.log('Uninstalling service...');
svc.uninstall();
