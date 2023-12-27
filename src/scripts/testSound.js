require('../modules/env');
const audioDevices = require('macos-audio-devices');
const externalAudioDeviceName = process.env.AUDIO_DEVICE_NAME;

setInterval(() => {
  try {
    let found = false;
    const outputDevices = audioDevices.getOutputDevices.sync();
    const defaultDevice = audioDevices.getDefaultOutputDevice.sync();

    console.log(outputDevices);
    console.log(defaultDevice);

    for (let i = 0; i < outputDevices.length; i++) {
      if (`${outputDevices[i].name}`.toLowerCase().indexOf(externalAudioDeviceName) !== -1) {
        found = outputDevices[i].id;
        break;
      }
    }

    if (found === false) {
      console.error('audio device not found');
    } else if (defaultDevice.id !== found) {
      console.log('force audio device');
      audioDevices.setDefaultOutputDevice(found);
    }
  } catch (e) {
    console.error(e);
  }
}, 1000);
