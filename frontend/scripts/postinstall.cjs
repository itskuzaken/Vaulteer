const { execSync } = require('child_process');
const os = require('os');

function run(cmd) {
  try {
    console.log('> Running:', cmd);
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.warn('> Command failed:', cmd, err && err.message);
  }
}

// If running on Linux, attempt to rebuild lightningcss from source
if (os.platform() === 'linux') {
  run('npm rebuild --build-from-source lightningcss');
}

console.log('postinstall script complete.');
