const { exec } = require('child_process');
const os = require('os');

// Ports to check and kill
const ports = [3001, 5000];

const isWindows = process.platform === 'win32';

// Function to kill process on a specific port
function killProcessOnPort(port) {
  return new Promise((resolve, reject) => {
    // Different commands for Windows vs Unix-based systems
    const command = os.platform() === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} -t`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`No process found on port ${port}`);
        resolve(false);
        return;
      }

      if (!stdout) {
        console.log(`No process using port ${port}`);
        resolve(false);
        return;
      }

      // Extract PID(s) from the output
      let pids = [];
      if (os.platform() === 'win32') {
        // Windows netstat output format
        const lines = stdout.split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 4) {
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(parseInt(pid))) {
              pids.push(pid);
            }
          }
        }
      } else {
        // Unix lsof output format
        pids = stdout.split('\n').filter(Boolean);
      }

      // Remove duplicates
      pids = [...new Set(pids)];

      if (pids.length === 0) {
        console.log(`No valid PID found for port ${port}`);
        resolve(false);
        return;
      }

      console.log(`Found PIDs for port ${port}:`, pids);

      // Kill each process
      let killedCount = 0;
      for (const pid of pids) {
        const killCommand = os.platform() === 'win32'
          ? `taskkill /F /PID ${pid}`
          : `kill -9 ${pid}`;

        exec(killCommand, (killError, killStdout, killStderr) => {
          if (killError) {
            console.log(`Failed to kill process ${pid}: ${killError.message}`);
          } else {
            console.log(`Successfully killed process ${pid} on port ${port}`);
            killedCount++;
          }

          if (killedCount === pids.length) {
            resolve(true);
          }
        });
      }
    });
  });
}

// Kill processes on all specified ports
async function killAllProcesses() {
  console.log('Checking for processes on ports:', ports);
  
  for (const port of ports) {
    try {
      await killProcessOnPort(port);
    } catch (error) {
      console.error(`Error handling port ${port}:`, error);
    }
  }
  
  console.log('Port cleanup completed');
}

// Run the cleanup
killAllProcesses().then(() => {
  console.log('All ports should be clear now');
  process.exit(0);
});

ports.forEach(port => {
    if (isWindows) {
        // Windows command
        exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
            if (stdout) {
                // Extract PID from the output
                const pid = stdout.split(' ').filter(Boolean).pop();
                if (pid) {
                    exec(`taskkill /F /PID ${pid}`, (err, out, stderr) => {
                        if (err) {
                            console.log(`No process running on port ${port}`);
                        } else {
                            console.log(`Killed process ${pid} on port ${port}`);
                        }
                    });
                }
            }
        });
    } else {
        // Unix-based command
        exec(`lsof -i :${port} -t | xargs kill -9`, (error, stdout, stderr) => {
            if (error) {
                console.log(`No process running on port ${port}`);
            } else {
                console.log(`Killed process on port ${port}`);
            }
        });
    }
}); 