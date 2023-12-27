require('./modules/env');
const { SerialPort } = require('serialport');
const { Database } = require('./modules/database');
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const chance = require('chance').Chance();
const audioDevices = require('macos-audio-devices');
const useExternalAudioDevice = false;
const externalAudioDeviceName = process.env.AUDIO_DEVICE_NAME;

process.on('uncaughtException', (e) => {
  console.log('uncaughtException');
  console.log(e);
});

const subjectsSB = ['adresse', 'ai', 'decolonial', 'ecologie', 'identite'];
const types = ['attack', 'resist'];

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 100000 }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.post('/settings', async (req, res) => {
  try {
    if (req.body.newSettings) {
      const newSettings = {};
      for (let key in req.body.newSettings) {
        newSettings[key] = req.body.newSettings[key];
        if (typeof newSettings[key] === 'string') {
          if (newSettings[key] === 'true' || newSettings[key] === 'false') {
            newSettings[key] = newSettings[key] === 'true';
          } else if (/^-?\d+\.\d+$/.test(newSettings[key])) {
            newSettings[key] = parseFloat(newSettings[key]);
          } else if (/^-?\d+$/.test(newSettings[key])) {
            newSettings[key] = parseInt(newSettings[key]);
          }
        }
      }
      await Database.replaceOne('settings', { _id: 'main' }, newSettings);
    }
    const settings = await Database.findOne('settings', { _id: 'main' });
    res.status(200).send({
      done: true,
      settings: settings,
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
});

app.post('/blocs', async (req, res) => {
  try {
    const blocs = await Database.find('sentence', {});
    res.status(200).send({
      done: true,
      blocs: blocs,
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
});

app.post('/parts', async (req, res) => {
  try {
    const blocs = await Database.find('sentence', { _id: /^sb_/i });
    const iparts = [];
    const pparts = [];
    for (let i = 0; i < blocs.length; i++) {
      let name = blocs[i]._id.split('_');
      name.pop();
      name = name.join('_');
      if ((/^sb_i_/i.test(name) || /respire/i.test(name)) && iparts.indexOf(name) === -1) {
        iparts.push(name);
      } else if (/^sb_p_/i.test(name) && /respire/i.test(name) === false && pparts.indexOf(name) === -1) {
        pparts.push(name);
      }
    }
    res.status(200).send({
      done: true,
      parts: {
        iparts: iparts,
        pparts: pparts,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
});

app.post('/pick', async (req, res) => {
  try {
    let pushAdresse = false;
    let quantity = 1;
    const finalSentences = [];
    const history = req.body.history || [];
    if (req.body.quantity) {
      if (typeof req.body.quantity === 'string') {
        quantity = parseInt(req.body.quantity, 10);
      } else {
        quantity = req.body.quantity;
      }
    }

    if (!req.body.query) {
      req.body.query = [{}];
    }

    for (let q = 0; q < req.body.query.length; q++) {
      let query = req.body.query[q];
      if (query.adresse) {
        pushAdresse = true;
        delete query.adresse;
      }
      if (query.chorale) {
        query._id = /bloc/;
        delete query.chorale;
      }
      let sortSb = false;
      if (query.sb) {
        let sbs = await Database.find('sentence', {
          _id: new RegExp(`^${query.sb}_`),
        });
        let keys = [];
        for (let sbi = 0; sbi < sbs.length; sbi++) {
          let _id = sbs[sbi]._id.replace(/\d+$/i, '');
          if (keys.indexOf(_id) === -1) {
            keys.push(_id);
          }
        }
        query._id = new RegExp(`^${chance.pickone(keys)}`);
        delete query.sb;
        sortSb = true;
      }

      let sentences = [];
      if (Object.keys(query).length > 0) {
        sentences = await Database.find('sentence', query);
      }

      if (
        (req.body.random === 'true' || req.body.random === true) &&
        Array.isArray(sentences) &&
        sentences.length > 0
      ) {
        sentences = chance.pickset(sentences, quantity);
      }

      if (sortSb === true) {
        sentences.sort((a, b) => {
          let id_a = a._id.split('_');
          id_a = parseInt(id_a[id_a.length - 1]);
          let id_b = b._id.split('_');
          id_b = parseInt(id_b[id_b.length - 1]);
          if (id_a < id_b) {
            return -1;
          }
          if (id_a > id_b) {
            return 1;
          }
          return 0;
        });
      }

      let thereIsOnlyTextAsPartition = null;

      for (let i = 0; i < sentences.length; i++) {
        if (history.indexOf(sentences[i]._id) === -1) {
          history.push(sentences[i]._id);
          let finalSentence = {
            _id: sentences[i]._id,
            destination: query.destination || sentences[i].destination,
            voice: query.voice || [],
            subject: sentences[i].subject,
            type: sentences[i].type,
            clips: [],
            tags: query.tags || sentences[i].tags,
            pause: sentences[i].pause,
          };
          if (!finalSentence.subject) {
            for (let ss = 0; ss < subjectsSB.length; ss++) {
              if (finalSentence._id.indexOf(subjectsSB[ss]) !== -1) {
                finalSentence.subject = subjectsSB[ss];
                break;
              }
            }
          }
          if (!finalSentence.type) {
            for (let st = 0; st < types.length; st++) {
              if (finalSentence._id.indexOf(`_${types[st][0]}_`) !== -1) {
                finalSentence.type = types[st];
                break;
              }
            }
          }
          if (query.voice && typeof sentences[i][`clip${query.voice}`] === 'string') {
            finalSentence.clips.push(path.basename(sentences[i][`clip${query.voice}`]));
          } else {
            if (typeof sentences[i].clipw === 'string') {
              finalSentence.voice.push('w');
              finalSentence.clips.push(path.basename(sentences[i].clipw));
            }
            if (typeof sentences[i].clipn === 'string') {
              finalSentence.voice.push('n');
              finalSentence.clips.push(path.basename(sentences[i].clipn));
            }
            if (typeof sentences[i].clipi === 'string') {
              finalSentence.voice.push('i');
              finalSentence.clips.push(path.basename(sentences[i].clipi));
            }
            if (typeof sentences[i].clipe === 'string') {
              finalSentence.voice.push('e');
              finalSentence.clips.push(path.basename(sentences[i].clipe));
            }
          }

          if (finalSentence.clips.length > 0 || finalSentence.pause) {
            finalSentences.push(finalSentence);
          } else if (
            thereIsOnlyTextAsPartition === null &&
            typeof sentences[i].text === 'string' &&
            /\w_\w+_\w,/i.test(sentences[i].text)
          ) {
            thereIsOnlyTextAsPartition = sentences[i].text.trim().split(',');
          }
        }
      }

      if (
        finalSentences.length === 0 &&
        Array.isArray(thereIsOnlyTextAsPartition) &&
        thereIsOnlyTextAsPartition.length > 0
      ) {
        for (let t = 0; t < thereIsOnlyTextAsPartition.length; t++) {
          thereIsOnlyTextAsPartition[t] = thereIsOnlyTextAsPartition[t].replace(/^(\w)_/, '\\w?$1\\w?_');
          thereIsOnlyTextAsPartition[t] = thereIsOnlyTextAsPartition[t].replace(/_(\w)$/, '_\\w?$1\\w?');
          let sbs = await Database.find('sentence', {
            _id: new RegExp(`^${thereIsOnlyTextAsPartition[t]}_`),
          });
          let keys = [];
          for (let sbi = 0; sbi < sbs.length; sbi++) {
            if (keys.indexOf(sbs[sbi]._id) === -1) {
              keys.push(sbs[sbi]._id);
            }
          }
          if (keys.length > 0) {
            let oneId = chance.pickone(keys);
            let sentence = await Database.findOne('sentence', { _id: oneId });
            if (sentence && history.indexOf(sentence._id) === -1) {
              history.push(sentence._id);
              let finalSentence = {
                _id: sentence._id,
                destination: query.destination || sentence.destination,
                voice: query.voice || [],
                subject: sentence.subject,
                type: sentence.type,
                clips: [],
                tags: query.tags || sentence.tags,
                pause: sentence.pause,
              };
              if (!finalSentence.subject) {
                for (let ss = 0; ss < subjectsSB.length; ss++) {
                  if (finalSentence._id.indexOf(subjectsSB[ss]) !== -1) {
                    finalSentence.subject = subjectsSB[ss];
                    break;
                  }
                }
              }
              if (!finalSentence.type) {
                for (let st = 0; st < types.length; st++) {
                  if (finalSentence._id.indexOf(`_${types[st][0]}_`) !== -1) {
                    finalSentence.type = types[st];
                    break;
                  }
                }
              }
              if (query.voice && typeof sentence[`clip${query.voice}`] === 'string') {
                finalSentence.clips.push(path.basename(sentence[`clip${query.voice}`]));
              } else {
                if (typeof sentence.clipw === 'string') {
                  finalSentence.voice.push('w');
                  finalSentence.clips.push(path.basename(sentence.clipw));
                }
                if (typeof sentence.clipn === 'string') {
                  finalSentence.voice.push('n');
                  finalSentence.clips.push(path.basename(sentence.clipn));
                }
                if (typeof sentence.clipi === 'string') {
                  finalSentence.voice.push('i');
                  finalSentence.clips.push(path.basename(sentence.clipi));
                }
                if (typeof sentence.clipe === 'string') {
                  finalSentence.voice.push('e');
                  finalSentence.clips.push(path.basename(sentence.clipe));
                }
              }
              if (finalSentence.clips.length > 0 || finalSentence.pause) {
                finalSentences.push(finalSentence);
              }
            }
          }
        }
      }

      if (pushAdresse === true) {
        let sentences = await Database.find('sentence', { _id: /^p_adresse/ });
        let sentence = chance.pickone(sentences);
        let finalSentence = {
          _id: sentence._id,
          destination: query.destination || sentence.destination,
          voice: query.voice || [],
          subject: sentence.subject,
          type: sentence.type,
          clips: [],
          tags: query.tags || sentence.tags,
          pause: sentence.pause,
        };
        if (!finalSentence.subject) {
          for (let ss = 0; ss < subjectsSB.length; ss++) {
            if (finalSentence._id.indexOf(subjectsSB[ss]) !== -1) {
              finalSentence.subject = subjectsSB[ss];
              break;
            }
          }
        }
        if (!finalSentence.type) {
          for (let st = 0; st < types.length; st++) {
            if (finalSentence._id.indexOf(`_${types[st][0]}_`) !== -1) {
              finalSentence.type = types[st];
              break;
            }
          }
        }
        if (query.voice && typeof sentence[`clip${query.voice}`] === 'string') {
          finalSentence.clips.push(path.basename(sentence[`clip${query.voice}`]));
        } else {
          if (typeof sentence.clipw === 'string') {
            finalSentence.voice.push('w');
            finalSentence.clips.push(path.basename(sentence.clipw));
          }
          if (typeof sentence.clipn === 'string') {
            finalSentence.voice.push('n');
            finalSentence.clips.push(path.basename(sentence.clipn));
          }
          if (typeof sentence.clipi === 'string') {
            finalSentence.voice.push('i');
            finalSentence.clips.push(path.basename(sentence.clipi));
          }
          if (typeof sentence.clipe === 'string') {
            finalSentence.voice.push('e');
            finalSentence.clips.push(path.basename(sentence.clipe));
          }
        }
        if (finalSentence.clips.length > 0 || finalSentence.pause) {
          if (finalSentences.length > 0 && /adresse/i.test(finalSentences[0]._id) === false) {
            finalSentences.unshift(finalSentence);
          }
        }
      }
    }
    res.status(200).send({
      done: true,
      sentences: finalSentences.slice(0, 128),
    });
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

app.post('/partition', async (req, res) => {
  try {
    const clips = [];
    const partition = req.body.partition;
    const history = req.body.history || [];

    for (let i = 0; i < partition.length; i++) {
      if (partition[i].destination === '*') {
        clips.push({
          _id: 'silence',
          clip: '_',
          text: 'silence',
        });
      } else if (partition[i].sb === true || partition[i].sb === 'true') {
        const re = new RegExp(`^sb_${partition[i].subject}_`, 'i');
        const sb = await Database.find('sentence', { _id: re });
        sb.sort((a, b) => {
          let id_a = a._id.split('_');
          id_a = parseInt(id_a[id_a.length - 1]);
          let id_b = b._id.split('_');
          id_b = parseInt(id_b[id_b.length - 1]);
          if (id_a < id_b) {
            return -1;
          }
          if (id_a > id_b) {
            return 1;
          }
          return 0;
        });
        for (let j = 0; j < sb.length; j++) {
          history.push(sb[j]._id);
          if (sb[j].pause !== null) {
            clips.push({
              _id: sb[j]._id,
              clip: 'pause',
              text: 'silence',
            });
          } else if (typeof sb[j].clipw === 'string') {
            clips.push({
              _id: sb[j]._id,
              clip: path.basename(sb[j].clipw),
              text: sb[j].text,
            });
          } else if (typeof sb[j].clipn === 'string') {
            clips.push({
              _id: sb[j]._id,
              clip: path.basename(sb[j].clipn),
              text: sb[j].text,
            });
          } else if (typeof sb[j].clipe === 'string') {
            clips.push({
              _id: sb[j]._id,
              clip: path.basename(sb[j].clipe),
              text: sb[j].text,
            });
          } else if (typeof sb[j].clipi === 'string') {
            clips.push({
              _id: sb[j]._id,
              clip: path.basename(sb[j].clipi),
              text: sb[j].text,
            });
          }
        }
      } else {
        delete partition[i].sb;
        let found = false;
        if (partition[i].id !== undefined) {
          let one = await Database.findOne('sentence', { _id: partition[i].id });
          if (one !== null) {
            if (typeof one[`clip${partition[i].voice}`] === 'string') {
              found = true;
              history.push(one._id);
              clips.push({
                _id: one._id,
                clip: path.basename(one[`clip${partition[i].voice}`]),
                text: one.text,
              });
            }
          }
        }
        let candidates;
        if (found === false) {
          if (partition[i].id !== undefined) {
            delete partition[i].id;
          }
          candidates = await Database.find('sentence', partition[i]);
          candidates = candidates
            .map((value) => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);
          for (let j = 0; j < candidates.length; j++) {
            if (
              found === false &&
              history.indexOf(candidates[j]._id) === -1 &&
              typeof candidates[j][`clip${partition[i].voice}`] === 'string'
            ) {
              found = true;
              history.push(candidates[j]._id);
              clips.push({
                _id: candidates[j]._id,
                clip: path.basename(candidates[j][`clip${partition[i].voice}`]),
                text: candidates[j].text,
              });
              break;
            }
          }
          if (found === false && candidates[0] && typeof candidates[0][`clip${partition[i].voice}`] === 'string') {
            history.push(candidates[0]._id);
            clips.push({
              _id: candidates[0]._id,
              clip: path.basename(candidates[0][`clip${partition[i].voice}`]),
              text: candidates[0].text,
            });
          }
        }
      }
    }
    res.status(200).send({
      done: true,
      clips: clips,
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
});

async function main() {
  await httpServer.listen(process.env.HTTP_PORT);
  const settings = await Database.findOne('settings', { _id: 'main' });

  if (settings.useSensor === true) {
    try {
      const port = new SerialPort(
        {
          path: settings.arduinoPort,
          baudRate: 115200,
        },
        (err) => {
          if (err) {
            console.log(err);
            setTimeout(() => {
              io.emit('no-sensor');
            }, 1000);
          }
        },
      );

      port.on('readable', () => {
        const data = port.read();
        const str = data.toString();
        if (/s+/.test(str) && /e/.test(str) === false) {
          io.emit('motion-start');
        } else if (/e+/.test(str) && /s/.test(str) === false) {
          io.emit('motion-end');
        }
      });

      port.on('error', (err) => {
        console.log(err);
        io.emit('no-sensor');
      });
    } catch (e) {}
  }

  setInterval(() => {
    if (useExternalAudioDevice === true) {
      try {
        let found = false;
        const outputDevices = audioDevices.getOutputDevices.sync();
        const defaultDevice = audioDevices.getDefaultOutputDevice.sync();

        for (let i = 0; i < outputDevices.length; i++) {
          if (`${outputDevices[i].name}`.toLowerCase().indexOf(externalAudioDeviceName) !== -1) {
            found = outputDevices[i].id;
            break;
          }
        }

        if (found === false) {
          console.log('audio device not found');
        } else if (defaultDevice.id !== found) {
          console.log('force audio device');
          audioDevices.setDefaultOutputDevice(found);
        }
      } catch (e) {
        console.log(e);
      }
    }
  }, 1000);
}

main();
