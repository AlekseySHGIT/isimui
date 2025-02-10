import { Service } from 'node-windows';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a new service object
const svc = new Service({
    name: 'ISIMUI',
    description: 'ISIM User Interface Application',
    script: join(__dirname, 'server.js'),
    execPath: process.execPath, // Explicitly set Node.js executable path
    workingDirectory: __dirname,
    env: [{
        name: "PORT",
        value: 3000
    }, {
        name: "ISIM_API_URL",
        value: "http://localhost:8080"
    }],
    grow: .5,
    wait: 2,
    maxRestarts: 3,
    maxRetries: 3,
    stopparentfirst: true
});

// Listen for the "install" event
svc.on('install', () => {
    console.log('Service installed successfully');
    
    // Start the service after installation
    svc.start();
});

svc.on('alreadyinstalled', () => {
    console.log('Service is already installed. Attempting to start...');
    svc.start();
});

svc.on('invalidinstallation', () => {
    console.error('Invalid installation detected');
});

svc.on('uninstall', () => {
    console.log('Service uninstalled');
});

svc.on('start', () => {
    console.log('Service started');
});

svc.on('stop', () => {
    console.log('Service stopped');
});

svc.on('error', (err) => {
    console.error('Service error:', err);
});

// Check if running with admin privileges
try {
    console.log('Installing service...');
    console.log('Service configuration:', {
        name: svc.name,
        description: svc.description,
        script: svc.script,
        workingDirectory: svc.workingDirectory,
        execPath: svc.execPath
    });
    
    svc.install();
} catch (err) {
    console.error('Failed to install service:', err);
    console.log('Please make sure you are running with administrator privileges');
}
