const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Kill any processes using the ports we need
console.log('Checking for processes using our ports...');
try {
    require('./kill-ports');
    console.log('Ports freed successfully.');
} catch (error) {
    console.error('Error freeing ports:', error);
}

// Start the server
console.log('Starting server...');
const server = spawn('node', ['server.js'], { 
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
});

let serverPort = null;
let serverStarted = false;

// Process server output
server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[SERVER]: ${output}`);
    
    // Extract the port from the server output
    const portMatch = output.match(/Server running on port (\d+)/);
    if (portMatch && portMatch[1]) {
        serverPort = portMatch[1];
        console.log(`Server detected on port ${serverPort}`);
        serverStarted = true;
        
        // Start the client after the server is ready
        startClient();
    }
});

server.stderr.on('data', (data) => {
    console.error(`[SERVER ERROR]: ${data.toString()}`);
});

// Function to start the client
function startClient() {
    console.log('Starting client...');
    
    // Change to the client directory
    process.chdir(path.join(__dirname, 'client'));
    
    // Start the client
    const client = spawn('npm', ['start'], { 
        stdio: 'inherit',
        shell: true
    });
    
    client.on('error', (error) => {
        console.error('Failed to start client:', error);
    });
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('Shutting down...');
    server.kill();
    process.exit();
});

// If server doesn't start within 10 seconds, try to start the client anyway
setTimeout(() => {
    if (!serverStarted) {
        console.log('Server startup timeout. Starting client anyway...');
        startClient();
    }
}, 10000); 