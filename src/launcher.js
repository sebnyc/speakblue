require('./modules/env');
const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const basePath = process.env.BASE_PATH;

let backend = null;
let frontend = null;

try {
  fs.unlinkSync(basePath + '/Documents/GitHub/speakblue/forceExit.txt');
} catch (ignore) {}
try {
  fs.unlinkSync(basePath + '/Documents/GitHub/speakblue/forceReset.txt');
} catch (ignore) {}
try {
  fs.unlinkSync(basePath + '/Documents/GitHub/speakblue/forceShutdown.txt');
} catch (ignore) {}
try {
  fs.unlinkSync(basePath + '/Documents/GitHub/speakblue/forceReboot.txt');
} catch (ignore) {}

async function launchPiece() {
  launchBackend();
  launchFrontend();
}

function launchBackend() {
  console.log('start backend');
  if (backend !== null) {
    backend.kill();
  }
  backend = null;
  backend = spawn(process.execPath, [path.join(__dirname, 'runtime_backend.js')], {
    pwd: path.join(__dirname),
  });
  backend.on('error', (err) => {
    console.error('backend error:', err);
  });
  backend.stdout.on('data', (data) => {
    console.log('backend data:', data.toString());
  });
  backend.on('close', (err) => {
    console.log('backend close:', err);
  });
}

function launchFrontend() {
  console.log('start frontend');
  if (frontend !== null) {
    frontend.kill();
  }
  frontend = null;
  frontend = spawn('npx', ['--offline', 'electron', path.join(__dirname, 'runtime_frontend.js')], {
    pwd: path.join(__dirname),
  });
  frontend.on('error', (err) => {
    console.error('frontend error:', err);
  });
  frontend.stdout.on('data', (data) => {
    console.log('frontend data:', data.toString());
  });
  frontend.on('close', async (err) => {
    console.log('frontend close:', err);
    if (
      fs.existsSync(basePath + '/Documents/GitHub/speakblue/forceReset.txt') &&
      !fs.existsSync(basePath + '/Documents/GitHub/speakblue/forceExit.txt')
    ) {
      fs.unlinkSync(basePath + '/Documents/GitHub/speakblue/forceReset.txt');
      launchFrontend();
    } else {
      if (backend !== null) {
        console.log('kill backend');
        backend.kill();
      }
      if (fs.existsSync(basePath + '/Documents/GitHub/speakblue/forceShutdown.txt')) {
        fs.unlinkSync(basePath + '/Documents/GitHub/speakblue/forceShutdown.txt');
        exec('sudo shutdown -h now');
      } else if (fs.existsSync(basePath + '/Documents/GitHub/speakblue/forceReboot.txt')) {
        fs.unlinkSync(basePath + '/Documents/GitHub/speakblue/forceReboot.txt');
        exec('sudo shutdown -r now');
      } else if (fs.existsSync(basePath + '/Documents/GitHub/speakblue/forceExit.txt')) {
        fs.unlinkSync(basePath + '/Documents/GitHub/speakblue/forceExit.txt');
      }
      setTimeout(function () {
        process.exit(0);
      }, 500);
    }
  });
}

setTimeout(() => {
  launchPiece();
}, 1000);
