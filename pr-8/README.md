# PR-8: Simple Live Server

A simple Live Server implementation that automatically reloads your HTML pages when files change, similar to VS Code's Live Server extension.

## Features

- 🚀 Serves static files from a target directory using native `http` module
- 📦 Streams files directly to clients using `fs.createReadStream` (no RAM loading)
- 🔄 Automatically reloads pages when files change
- 🔌 WebSocket-based real-time communication
- 📁 Watches directory for file changes using `fs.watch` (add, modify, delete)
- 💉 Automatically injects reload script into HTML files using Transform streams
- 🛡️ Security: Prevents directory traversal attacks

## Installation

```bash
cd pr-8
npm install
```

## Usage

### Basic Usage

Start the server with default settings (watches `./target` directory):

```bash
npm start
```

### Custom Target Directory

Set the `TARGET_DIR` environment variable to specify a custom directory to watch:

```bash
# Windows PowerShell
$env:TARGET_DIR="C:\path\to\your\html\files"; npm start

# Windows CMD
set TARGET_DIR=C:\path\to\your\html\files && npm start

# Linux/Mac
TARGET_DIR=/path/to/your/html/files npm start
```

### Custom Port

Set the `PORT` environment variable to use a different port:

```bash
# Windows PowerShell
$env:PORT=8080; npm start

# Linux/Mac
PORT=8080 npm start
```

## How It Works

1. **Start the server**: The server starts and watches the target directory for changes
2. **Open HTML file**: Navigate to `http://localhost:3000/your-file.html` in your browser
3. **Automatic injection**: The server automatically injects a WebSocket client script into your HTML file
4. **WebSocket connection**: The injected script establishes a WebSocket connection to the server
5. **File change detection**: When you modify any file in the target directory, the server detects the change
6. **Automatic reload**: The server sends a reload message via WebSocket, and your browser automatically reloads the page

## Example Workflow

1. Create an HTML file in the target directory (e.g., `target/index.html` or `target/some-dir/some-file.html`)
2. Start the server: `npm start`
3. Open `http://localhost:3000/index.html` or `http://localhost:3000/some-dir/some-file.html` in your browser
4. Edit the HTML file in your editor
5. Save the file
6. The browser automatically reloads to show your changes!

## File-Based Routing

The server uses file-based routing. The path in your HTTP request maps directly to the file path in the target directory.

**Example:**
- Request: `http://localhost:3000/some-dir/some-file.html`
- File served: `target/some-dir/some-file.html`

## Project Structure

```
pr-8/
├── index.js          # Main server file (uses native http module)
├── package.json      # Dependencies and scripts
├── README.md         # This file
└── target/           # Default target directory (created automatically)
    ├── index.html
    └── some-dir/
        └── some-file.html
```

## Implementation Details

### HTTP Server
- Uses native Node.js `http` module (no Express framework)
- Implements file-based routing
- Security: Prevents directory traversal attacks

### File Streaming
- Uses `fs.createReadStream` to stream files directly to clients
- Files are not loaded into RAM - efficient memory usage
- Uses `pipe()` to direct data streams to HTTP response

### Script Injection
- Uses `stream.Transform` to inject WebSocket script into HTML files
- Checks for `</body>` tag in stream chunks
- Injects script before `</body>` tag or appends at end if no body tag found

### Directory Watching
- Uses `fs.watch` (native Node.js) to monitor directory changes
- Watches recursively for file changes, additions, and deletions
- Triggers WebSocket reload messages on any change

## Dependencies

- **ws**: WebSocket library for real-time communication

## Environment Variables

- `PORT`: Server port (default: 3000)
- `TARGET_DIR`: Directory to watch and serve files from (default: `./target`)

## Notes

- The server automatically creates the target directory if it doesn't exist
- Only HTML files get the WebSocket script injected
- The script is injected just before the closing `</body>` tag using Transform streams
- All file changes (add, modify, delete) trigger a reload
- The server gracefully handles shutdown signals (SIGINT, SIGTERM)
- Files are streamed directly without loading into memory
