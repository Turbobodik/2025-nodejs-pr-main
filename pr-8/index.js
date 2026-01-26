const http = require('http');
const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const TARGET_DIR = process.env.TARGET_DIR || path.join(__dirname, 'target');

// Ensure target directory exists
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  console.log(`[Live Server] Created target directory: ${TARGET_DIR}`);
}

// WebSocket client script to inject into HTML files
const WEBSOCKET_CLIENT_SCRIPT = `
<script>
(function() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(protocol + '//' + window.location.host);
  
  ws.onopen = function() {
    console.log('[Live Server] Connected to server');
  };
  
  ws.onmessage = function(event) {
    if (event.data === 'reload') {
      console.log('[Live Server] Reloading page...');
      window.location.reload();
    }
  };
  
  ws.onerror = function(error) {
    console.error('[Live Server] WebSocket error:', error);
  };
  
  ws.onclose = function() {
    console.log('[Live Server] Connection closed');
  };
})();
</script>
`;

// Store connected WebSocket clients
const clients = new Set();

// Create HTTP server
const server = http.createServer((req, res) => {
  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = url.pathname;

  // Handle root path - serve index.html
  if (filePath === '/') {
    filePath = '/index.html';
  }

  // Remove leading slash and construct full file path
  const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  const fullPath = path.join(TARGET_DIR, relativePath);

  // Security: prevent directory traversal
  const resolvedPath = path.resolve(fullPath);
  const resolvedTargetDir = path.resolve(TARGET_DIR);
  
  if (!resolvedPath.startsWith(resolvedTargetDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden: Directory traversal not allowed');
    return;
  }

  // Check if file exists
  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    // Determine content type
    const ext = path.extname(fullPath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // For HTML files, inject WebSocket script using Transform stream
    if (ext === '.html') {
      // Create read stream
      const readStream = fs.createReadStream(fullPath, { encoding: 'utf8' });

      // Create Transform stream to inject script
      const injectScriptTransform = new Transform({
        encoding: 'utf8',
        transform(chunk, encoding, callback) {
          // Buffer previous chunk if needed (for handling split tags)
          const buffer = this.buffer || '';
          let data = buffer + chunk.toString();
          
          // Check if chunk contains </body> tag
          if (data.includes('</body>')) {
            // Inject script before </body>
            data = data.replace('</body>', WEBSOCKET_CLIENT_SCRIPT + '\n</body>');
            this.injected = true;
            this.buffer = ''; // Clear buffer
          } else {
            // Keep last 10 characters in buffer in case </body> is split across chunks
            this.buffer = data.slice(-10);
            data = data.slice(0, -10);
          }
          
          callback(null, data);
        },
        flush(callback) {
          // If script wasn't injected (no </body> tag found), append it
          if (!this.injected) {
            const remaining = this.buffer || '';
            callback(null, remaining + WEBSOCKET_CLIENT_SCRIPT);
          } else {
            // Output any remaining buffered data
            const remaining = this.buffer || '';
            if (remaining) {
              callback(null, remaining);
            } else {
              callback();
            }
          }
        }
      });

      // Set headers and pipe stream
      res.writeHead(200, { 'Content-Type': contentType });
      readStream
        .pipe(injectScriptTransform)
        .pipe(res);

      // Handle errors
      readStream.on('error', (err) => {
        console.error(`[Live Server] Error reading file: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      });

      injectScriptTransform.on('error', (err) => {
        console.error(`[Live Server] Error in transform: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      });
    } else {
      // For non-HTML files, stream directly without transformation
      const readStream = fs.createReadStream(fullPath);
      
      res.writeHead(200, { 'Content-Type': contentType });
      readStream.pipe(res);

      readStream.on('error', (err) => {
        console.error(`[Live Server] Error reading file: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      });
    }
  });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// WebSocket connection handler
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[Live Server] Client connected. Total clients: ${clients.size}`);

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[Live Server] Client disconnected. Total clients: ${clients.size}`);
  });

  ws.on('error', (error) => {
    console.error('[Live Server] WebSocket error:', error);
  });
});

// Broadcast reload message to all connected clients
function broadcastReload() {
  const message = 'reload';
  let sentCount = 0;
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        sentCount++;
      } catch (err) {
        console.error('[Live Server] Error sending reload message:', err);
      }
    }
  });
  
  if (sentCount > 0) {
    console.log(`[Live Server] Broadcasted reload to ${sentCount} client(s)`);
  }
}

// Watch for file changes using fs.watch
function watchDirectory(dirPath) {
  console.log(`[Live Server] Watching directory: ${dirPath}`);

  const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    const filePath = path.join(dirPath, filename);
    
    // Check if file exists (to distinguish between change and delete)
    fs.stat(filePath, (err, stats) => {
      if (err) {
        // File was deleted
        console.log(`[Live Server] File deleted: ${filePath}`);
        broadcastReload();
      } else if (stats.isFile()) {
        // File was changed or added
        if (eventType === 'change') {
          console.log(`[Live Server] File changed: ${filePath}`);
          broadcastReload();
        } else if (eventType === 'rename') {
          console.log(`[Live Server] File added: ${filePath}`);
          broadcastReload();
        }
      }
    });
  });

  watcher.on('error', (error) => {
    console.error(`[Live Server] Watcher error:`, error);
  });

  return watcher;
}

// Start watching the target directory
const directoryWatcher = watchDirectory(TARGET_DIR);

// Start server
server.listen(PORT, () => {
  console.log(`[Live Server] Server is running on http://localhost:${PORT}`);
  console.log(`[Live Server] Target directory: ${TARGET_DIR}`);
  console.log(`[Live Server] Open your HTML files at http://localhost:${PORT}/your-file.html`);
});

// Graceful shutdown
function shutdown() {
  console.log('\n[Live Server] Shutting down gracefully...');
  
  // Close directory watcher
  if (directoryWatcher) {
    directoryWatcher.close();
  }
  
  // Close WebSocket server
  wss.close(() => {
    // Close HTTP server
    server.close(() => {
      console.log('[Live Server] Server closed');
      process.exit(0);
    });
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
