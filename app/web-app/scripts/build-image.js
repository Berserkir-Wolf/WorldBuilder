const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageJson.version;

if (!version) {
  throw new Error('The application package does not define a version.');
}

const repositoryRoot = path.resolve(__dirname, '..', '..');
const result = spawnSync('docker', ['compose', 'build'], {
  cwd: repositoryRoot,
  env: { ...process.env, APP_VERSION: version },
  stdio: 'inherit'
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
