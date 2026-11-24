// Starts the website. Replaces `next start` / `next dev` so that we control two security-critical things:
//  1. WHO can connect: default is this computer only (127.0.0.1). Set HOST=0.0.0.0 to share on your network.
//  2. WHO the visitor is: the "X-Forwarded-For" header can be faked by any visitor, so it is overwritten with the real
//     connection address. Only set TRUST_PROXY=1 when the site sits behind your own proxy that sets that header itself.
const http = require('http');
const next = require('next');

const dev = !process.argv.includes('--prod');
const hostname = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const trustProxy = process.env.TRUST_PROXY === '1';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    if (!trustProxy) {
      req.headers['x-forwarded-for'] = req.socket.remoteAddress || 'unknown';
      req.headers['x-forwarded-proto'] = 'http';
      delete req.headers['x-real-ip'];
      delete req.headers['forwarded'];
    } else if (req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // behind HTTPS: browsers must keep using it
    }
    handle(req, res);
  });
  if (dev && app.getUpgradeHandler) { const up = app.getUpgradeHandler(); server.on('upgrade', (req, socket, head) => up(req, socket, head)); }
  server.listen(port, hostname, () => {
    console.log(`> Website ready on http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}  (${dev ? 'development' : 'production'}${hostname === '0.0.0.0' ? ', shared on your network' : ', this computer only'}${trustProxy ? ', trusting proxy headers' : ''})`);
  });
});
