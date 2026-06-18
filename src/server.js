const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { loadEnv } = require('./env');

loadEnv();

const { createDatabase } = require('./db');
const { handleApi } = require('./routes');

const publicDir = path.join(__dirname, '..', 'public');
const startPort = Number(process.env.PORT || 3000);
let db;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  if ((req.url || '').startsWith('/api/')) {
    handleApi(req, res, db);
    return;
  }

  serveStatic(req, res);
});

function serveStatic(req, res) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  let filePath = decodeURIComponent(requestUrl.pathname);

  if (filePath === '/') {
    filePath = '/index.html';
  }

  const resolved = path.normalize(path.join(publicDir, filePath));
  if (!resolved.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(resolved, (error, content) => {
    if (error) {
      const fallbackFile = shouldServePublicPortal(requestUrl.pathname) ? 'public.html' : 'index.html';
      fs.readFile(path.join(publicDir, fallbackFile), (fallbackError, fallbackContent) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': mimeTypes['.html'] });
        res.end(fallbackContent);
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(resolved)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(content);
  });
}

function shouldServePublicPortal(pathname) {
  const segments = decodeURIComponent(pathname || '/')
    .split('/')
    .filter(Boolean);

  if (!segments.length || segments.length > 2) return false;
  if (segments.some((segment) => segment.includes('.'))) return false;

  const reserved = new Set([
    'admin',
    'admin-login',
    'owner',
    'owner-login',
    'customer',
    'customer-login',
    'index',
    'public'
  ]);

  return !reserved.has(segments[0].toLowerCase());
}

function listen(port) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} dang duoc su dung. Server co the dang chay san tai http://localhost:${port}`);
      console.error('Hay bam Ctrl + C de tat server cu, hoac dung lenh: Stop-Process -Id <PID>');
      process.exit(1);
    }
    console.error(error);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`Membership manager running at http://localhost:${port}`);
    console.log(`MariaDB database: ${process.env.DB_NAME || 'memberhub'}`);
  });
}

process.on('SIGINT', () => {
  shutdown();
});

process.on('SIGTERM', () => {
  shutdown();
});

async function shutdown() {
  if (db) {
    await db.close();
  }
  process.exit(0);
}

async function start() {
  db = await createDatabase();
  listen(startPort);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
