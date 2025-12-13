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
  // Try a safe rebuild to ensure platform-specific binaries are available
  run('npm rebuild --build-from-source lightningcss');
}

// Fallback: if CSS transformer WASM is desired but missing, this script doesn't handle it.
console.log('postinstall script complete.');
