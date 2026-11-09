import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;

// 1. Create HTTP server to serve index.html
const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading index.html');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

// 2. Create WebSocketServer attached to the HTTP server
const wss = new WebSocketServer({ server });

// 3. Register connection listener
wss.on('connection', (socket, req) => {
  // 4. Parse username from URL query string and broadcast join message
  const username = new URL(req.url, "http://localhost").searchParams.get("username");
  
  const joinMsg = JSON.stringify({ type: 'system', text: `${username} joined` });
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(joinMsg);
    }
  });

  // 5. Register message listener
  socket.on('message', (message) => {
    let parsedData;
    try {
      parsedData = JSON.parse(message);
    } catch (e) {
      return;
    }

    const chatMsg = JSON.stringify({
      type: 'chat',
      username: parsedData.username,
      text: parsedData.text
    });

    wss.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(chatMsg);
      }
    });
  });

  // 6. Register close listener
  socket.on('close', () => {
    const leaveMsg = JSON.stringify({ type: 'system', text: `${username} left` });
    wss.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(leaveMsg);
      }
    });
  });
});

// 7. Start the server
server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});