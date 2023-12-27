require('./env');
const path = require('path');
const { io } = require('socket.io-client');
const needle = require('needle');

class Runtime {
  constructor() {
    this.id = `${process.env.SBID}`;
    this.currentTextId = null;
    this.next = null;

    this.socket = io(`ws://${process.env.HTTP_BASE_URI}:${process.env.HTTP_PORT}`, {
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => {
      console.log('connected');
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });

    this.socket.on('error', (e) => {
      console.error(e);
    });

    this.socket.on('clip', (data) => {
      if (data && data.myID && `${data.myID}` === this.id && `${data.presetId}` === this.currentTextId) {
        const clipUrl = `http://${process.env.HTTP_BASE_URI}:${process.env.HTTP_PORT}/clips/${data.clipFileName}`;
        const output = path.join(__dirname, '..', '..', 'public', 'runtime', `${data.clipFileName}`);
        needle.get(clipUrl, { follow_max: 10, output: output }, async (err) => {
          if (err) {
            console.error(err);
            if (typeof this.next === 'function') {
              this.next(false, this.currentTextId);
            }
          } else {
            if (typeof this.next === 'function') {
              this.next(true, this.currentTextId, output);
            }
          }
        });
      }
    });
  }

  setNext(next) {
    this.next = next;
  }

  getVoiceForSentence(sentence, voiceIndex) {
    let voice = 'natural';
    switch (sentence.voice[voiceIndex]) {
      case 'w':
        voice = 'whisper';
        break;
      case 'e':
        voice = 'emotional';
        break;
      case 'i':
        voice = 'question';
        break;
    }
    return voice;
  }

  async generate(sentence, voiceIndex) {
    try {
      let voice = this.getVoiceForSentence(sentence, voiceIndex);
      let text = sentence.text;
      let rate = 100;
      if (
        (sentence.destination === 'i' ||
          (Array.isArray(sentence.destination) && sentence.destination.indexOf('i') !== -1)) &&
        voice === 'natural'
      ) {
        rate = 88;
      }
      if (
        (sentence.destination === 'i' ||
          (Array.isArray(sentence.destination) && sentence.destination.indexOf('i') !== -1)) &&
        /souffle/gim.test(sentence._id) === false
      ) {
        text = text.replace(/\*/gim, ' ');
        text = text.replace(/[.,;:!?()"]/gim, ' ');
        text = text.replace(/\s+/gim, ' ');
        text = text.trim();
      }
      await needle.post(`http://${process.env.HTTP_BASE_URI}:${process.env.HTTP_PORT}/speak`, {
        myID: this.id,
        id: `${sentence._id}_${voiceIndex}`,
        text: text,
        params: {
          name: `${sentence._id}_${voiceIndex}`,
          voice: voice,
          pitch: 3,
          volume: 3,
          rate: rate,
        },
      });
      this.currentTextId = `${sentence._id}_${voiceIndex}`;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

exports.Runtime = new Runtime();
