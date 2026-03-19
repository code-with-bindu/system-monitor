import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import * as si from 'systeminformation';
import * as http from 'http';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Types
interface SystemData {
  cpu: number;
  ram: number;
  ramTotal: number;
  ramUsed: number;
  uptime: number;
  platform: string;
  timestamp: string;
}

// Serve frontend
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>🖥️ Live System Monitor</title>
  <style>
    body { font-family: Arial; background: #1a1a2e; color: #eee; text-align: center; padding: 20px; }
    h1 { color: #00d4ff; }
    .card { background: #16213e; border-radius: 15px; padding: 20px; margin: 10px auto; width: 300px; display: inline-block; }
    .value { font-size: 2.5em; font-weight: bold; color: #00d4ff; }
    .label { font-size: 0.9em; color: #aaa; margin-top: 5px; }
    .bar { background: #0f3460; border-radius: 10px; height: 20px; margin-top: 10px; }
    .bar-fill { background: #00d4ff; border-radius: 10px; height: 20px; transition: width 0.5s; }
    #status { color: #00ff88; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>🖥️ Live System Monitor</h1>
  <p id="status">⏳ Connecting...</p>
  <div class="card">
    <div class="value" id="cpu">0%</div>
    <div class="label">CPU Usage</div>
    <div class="bar"><div class="bar-fill" id="cpu-bar" style="width:0%"></div></div>
  </div>
  <div class="card">
    <div class="value" id="ram">0%</div>
    <div class="label">RAM Usage</div>
    <div class="bar"><div class="bar-fill" id="ram-bar" style="width:0%"></div></div>
  </div>
  <div class="card">
    <div class="value" id="uptime">0h</div>
    <div class="label">System Uptime</div>
  </div>
  <div class="card">
    <div class="value" id="platform">-</div>
    <div class="label">Platform</div>
  </div>
  <p id="timestamp"></p>
  <script>
    const ws = new WebSocket('ws://localhost:3000');
    ws.onopen = () => document.getElementById('status').innerText = '🟢 Live - Updates every second';
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      document.getElementById('cpu').innerText = data.cpu + '%';
      document.getElementById('cpu-bar').style.width = data.cpu + '%';
      document.getElementById('ram').innerText = data.ram + '%';
      document.getElementById('ram-bar').style.width = data.ram + '%';
      document.getElementById('uptime').innerText = Math.floor(data.uptime / 3600) + 'h ' + Math.floor((data.uptime % 3600) / 60) + 'm';
      document.getElementById('platform').innerText = data.platform;
      document.getElementById('timestamp').innerText = '🕐 ' + data.timestamp;
    };
  </script>
</body>
</html>
  `);
});

// WebSocket - send live data every second
wss.on('connection', (ws: WebSocket) => {
  console.log('✅ Client connected!');
  
  const interval = setInterval(async () => {
    const cpuData = await si.currentLoad();
    const ramData = await si.mem();
    
    const data: SystemData = {
      cpu: Math.round(cpuData.currentLoad),
      ram: Math.round((ramData.used / ramData.total) * 100),
      ramTotal: Math.round(ramData.total / 1024 / 1024 / 1024),
      ramUsed: Math.round(ramData.used / 1024 / 1024 / 1024),
      uptime: Math.round(si.time().uptime),
      platform: process.platform,
      timestamp: new Date().toLocaleTimeString()
    };
    
    ws.send(JSON.stringify(data));
  }, 1000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('❌ Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('✅ System Monitor running at http://localhost:3000');
});