// Starts a PRIVATE copy of the website just for the automated tests:
//  * its own port (3100), so your real site on port 3000 is never touched
//  * its own empty data folder (data-test), created fresh every run, so your real products, enquiries and admin login are never touched
//  * its own throw-away admin password (kept in .env.test, hashed into data-test/auth.json)
// It uses two test-only switches (TRUST_PROXY, ALLOW_INSECURE_ADMIN) so each test can pretend to be a different visitor.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'data-test');
const envFile = path.join(root, '.env.test');

fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

let pw = (/^LOCAL_ADMIN_PASSWORD=(.*)$/m.exec(fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '') || [])[1];
pw = pw && pw.trim();
if (!pw) {
  pw = crypto.randomBytes(12).toString('base64url') + '9';
  fs.writeFileSync(envFile, `# Password of the PRIVATE test site only (data-test/). It is not your real admin password.\nLOCAL_ADMIN_PASSWORD=${pw}\n`);
}
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
fs.writeFileSync(path.join(dir, 'auth.json'), JSON.stringify({ salt, hash }));

const child = spawn(process.execPath, ['server.js', '--prod'], {
  cwd: root, stdio: 'inherit',
  env: { ...process.env, PORT: '3100', HOST: '127.0.0.1', TRUST_PROXY: '1', ALLOW_INSECURE_ADMIN: '1', DATA_DIR: dir },
});
const stop = () => child.kill();
process.on('SIGTERM', stop); process.on('SIGINT', stop); process.on('exit', stop);
child.on('exit', (code) => process.exit(code ?? 0));
