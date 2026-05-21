import { spawn } from 'child_process';

function startServer() {
  console.log(`[${new Date().toISOString()}] Starting server...`);
  
  const server = spawn('node', ['.next/standalone/server.js'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_ENV: 'production', PORT: '3000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  server.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  server.on('close', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited with code ${code}, signal ${signal}. Restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  server.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Server error:`, err);
    setTimeout(startServer, 3000);
  });
}

startServer();
