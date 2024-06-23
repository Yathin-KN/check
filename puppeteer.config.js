const { execSync } = require('child_process');
const { join } = require('path');
const { existsSync } = require('fs');

const chromePath = join(__dirname, 'node_modules', 'puppeteer', '.local-chromium', 'linux-1022525', 'chrome-linux', 'chrome');

if (!existsSync(chromePath)) {
  execSync('npx puppeteer install');
}
