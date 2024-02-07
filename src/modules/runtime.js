require('./env');
const path = require('path');
const { io } = require('socket.io-client');
const needle = require('needle');
const {v4: uuidv4} = require("uuid");
const {decode} = require("html-entities");
const { Resemble } = require('./resemble');


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

    // this.socket.on('clip', (data) => {
    //   if (data && data.myID && `${data.myID}` === this.id && `${data.presetId}` === this.currentTextId) {
    //     const clipUrl = `http://${process.env.HTTP_BASE_URI}:${process.env.HTTP_PORT}/clips/${data.clipFileName}`;
    //     const output = path.join(__dirname, '..', '..', 'public', 'runtime', `${data.clipFileName}`);
    //     needle.get(clipUrl, { follow_max: 10, output: output }, async (err) => {
    //       if (err) {
    //         console.error(err);
    //         if (typeof this.next === 'function') {
    //           this.next(false, this.currentTextId);
    //         }
    //       } else {
    //         if (typeof this.next === 'function') {
    //           this.next(true, this.currentTextId, output);
    //         }
    //       }
    //     });
    //   }
    // });
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
      // await needle.post(`http://${process.env.HTTP_BASE_URI}:${process.env.HTTP_PORT}/speak`, {
      //   myID: this.id,
      //   id: `${sentence._id}_${voiceIndex}`,
      //   text: text,
      //   params: {
      //     name: `${sentence._id}_${voiceIndex}`,
      //     voice: voice,
      //     pitch: 3,
      //     volume: 3,
      //     rate: rate,
      //   },
      // });
      this.currentTextId = `${sentence._id}_${sentence.voice[voiceIndex]}`;
      await this.callResemble(
          this.currentTextId,
          text,
          {
            voice: voice,
            pitch: 3,
            volume: 3,
            rate: rate,
          });

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async callResemble(id, text, params) {
    const xml = [];
    // const clipId = uuidv4();
    const voiceId = Resemble.getVoiceByEmotion(params.voice);
    const pitch = Resemble.getPitchByNumericValue(parseInt(params.pitch, 10));
    const volume = Resemble.getVolumeByNumericValue(parseInt(params.volume, 10));
    const rate = Resemble.getRateByNumericValue(parseInt(params.rate, 10));

    let textToSpeak = decode(text);
    textToSpeak = textToSpeak.replace(/</gim, '');
    textToSpeak = textToSpeak.replace(/>/gim, '');
    textToSpeak = textToSpeak.replace(/\*/gim, '<break time="0.5s"/>');
    textToSpeak = textToSpeak.replace(/à/gim, 'a');
    textToSpeak = textToSpeak.replace(/â/gim, 'a');
    textToSpeak = textToSpeak.replace(/ô/gim, 'au');
    textToSpeak = textToSpeak.replace(/\by\b/gim, 'i');
    textToSpeak = textToSpeak.replace(/rythm/gim, 'ritmmm');
    textToSpeak = textToSpeak.replace(/rithm/gim, 'ritmmm');
    textToSpeak = textToSpeak.replace(/cosmos/gim, 'cosmoss');
    textToSpeak = textToSpeak.replace(/speakblue/gim, 'spikblou');
    textToSpeak = textToSpeak.replace(/…/gim, '...');
    textToSpeak = textToSpeak.replace(/{/gim, '');
    textToSpeak = textToSpeak.replace(/}/gim, '');
    textToSpeak = textToSpeak.replace(/’/gim, "'");
    textToSpeak = textToSpeak.replace(/«/gim, '');
    textToSpeak = textToSpeak.replace(/»/gim, '');
    textToSpeak = textToSpeak.replace(/l'/gim, 'l');
    textToSpeak = textToSpeak.replace(/\*+!\*+!\*+/gim, ',,,!,,,!,,,');
    textToSpeak = textToSpeak.replace(/[^\x00-\xFFâàäéèêëîïìôöòûüùç€-]/g, '');

    if (
        (/^,/i.test(textToSpeak) || /^./i.test(textToSpeak) || /^!/i.test(textToSpeak) || /^;/i.test(textToSpeak)) &&
        /\w+/gim.test(textToSpeak) === false
    ) {
      textToSpeak = ',,,,e,' + textToSpeak;
    }
    if (/^,+!+,+!+,+/i.test(textToSpeak) === false && /^"!",+!+,+!+,+/i.test(textToSpeak) === false) {
      textToSpeak = `,,,!,,,!,,,${textToSpeak}`;
    }

    console.log(`[${textToSpeak}] ${params.voice} / rate ${params.rate}%`);

    xml.push(`<speak>`);
    xml.push(`<voice name="${voiceId}" uuid="${voiceId}">`);
    xml.push(`<prosody pitch="${pitch}" volume="${volume}" rate="${rate}">`);
    xml.push(textToSpeak);
    xml.push(`</prosody>`);
    xml.push(`</voice>`);
    xml.push(`</speak>`);

    const xmlText = xml.join('');

    const response = await Resemble.createClipSync(id, voiceId, xmlText);
    if (!response.success) {
      console.log("Resemble API error");
      console.log(response);
      if (typeof this.next === 'function') {
        this.next(false, this.currentTextId);
      }
      return;
    }

    const clipUrl = response.item.audio_src;
    const output = path.join(__dirname, '..', '..', 'public', 'runtime', `${id}.mp3`);
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

}

exports.Runtime = new Runtime();
