const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageJson.version;
const imageName = 'berserkirwolf/worldbuilder';

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

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

const tagResult = spawnSync('docker', ['tag', `${imageName}:${version}`, `${imageName}:latest`], {
  cwd: repositoryRoot,
  stdio: 'inherit'
});

if (tagResult.error) {
  throw tagResult.error;
}

process.exit(tagResult.status ?? 1);
