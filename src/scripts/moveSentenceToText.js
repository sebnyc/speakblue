require('../modules/env');
const { Database, ObjectId } = require('../modules/database');
const path = require('path');

async function main() {
  const sentences = await Database.find('sentence', {});
  const baseIds = {};
  const partitions = {};
  for (let i = 0; i < sentences.length; i++) {
    const oldSentence = sentences[i];

    if (oldSentence.text && /\w_\w+_\w,/.test(oldSentence.text) === false) {
      const newText = {
        _id: ObjectId().toString(),
        old_id: `${oldSentence._id}`,
        label: null,
        text: `${oldSentence.text}`,
        destination: oldSentence.destination || ['i', 'p'],
        bias: [],
        type: [],
        subject: null,
        weight: [0],
        voice: oldSentence.voice || ['w', 'n', 'i', 'e'],
        clip_w: null,
        clip_n: null,
        clip_i: null,
        clip_e: null,
        filter: null,
        author: 'admin',
      };

      // Destination:
      newText.destination = newText.destination.map((item) => {
        if (item === 'i') {
          return 'interieure';
        }
        return 'publique';
      });

      // Bias:
      if (/atta/i.test(`${oldSentence.type}`) === true && newText.bias.indexOf('attaque') === -1) {
        newText.bias.push('attaque');
      }
      if (/resis/i.test(`${oldSentence.type}`) === true && newText.bias.indexOf('resiste') === -1) {
        newText.bias.push('resiste');
      }

      // Type:
      if (/transi/i.test(`${oldSentence.type}`) === true && newText.type.indexOf('transition') === -1) {
        newText.type.push('transition');
      }
      if (/transi/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('transition') === -1) {
        newText.type.push('transition');
      }
      if (/liaison/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('transition') === -1) {
        newText.type.push('transition');
      }
      if (/soufflel/i.test(`${oldSentence.type}`) === true && newText.type.indexOf('souffle-long') === -1) {
        newText.type.push('souffle-long');
      }
      if (/soufflel/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('souffle-long') === -1) {
        newText.type.push('souffle-long');
      }
      if (/soufflec/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('souffle-court') === -1) {
        newText.type.push('souffle-court');
      }
      if (/speed/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('speed') === -1) {
        newText.type.push('speed');
      }
      if (/comment/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('commentaire') === -1) {
        newText.type.push('commentaire');
      }
      if (/djeun/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('commentaire') === -1) {
        newText.type.push('commentaire');
      }
      if (/dress/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('adresse') === -1) {
        newText.type.push('adresse');
      }
      if (/sujet/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('citation') === -1) {
        newText.type.push('citation');
      }
      if (/bloc/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('phrase-longue') === -1) {
        newText.type.push('phrase-longue');
      }
      if (/mavoix/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('ma-voix') === -1) {
        newText.type.push('ma-voix');
      }
      if (/unevoix/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('une-voix') === -1) {
        newText.type.push('une-voix');
      }
      if (/jesuis/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('je-suis') === -1) {
        newText.type.push('je-suis');
      }
      if (/meteo/i.test(`${oldSentence.subject}`) === true && newText.type.indexOf('meteo') === -1) {
        newText.type.push('meteo');
      }
      if (/_meteo/i.test(`${oldSentence._id}`) === true && newText.type.indexOf('meteo') === -1) {
        newText.type.push('meteo');
      }

      // Subject:
      if (/capital/i.test(`${oldSentence.subject}`) === true && newText.subject === null) {
        newText.subject = 'capital';
      }
      if (
        (/^ai/i.test(`${oldSentence.subject}`) === true || /ai$/i.test(`${oldSentence.subject}`) === true) &&
        newText.subject === null
      ) {
        newText.subject = 'ia';
      }
      if (/coloni/i.test(`${oldSentence.subject}`) === true && newText.subject === null) {
        newText.subject = 'decolonial';
      }
      if (/ecolo/i.test(`${oldSentence.subject}`) === true && newText.subject === null) {
        newText.subject = 'ecologie';
      }
      if (/ident/i.test(`${oldSentence.subject}`) === true && newText.subject === null) {
        newText.subject = 'identite';
      }
      if (/politi/i.test(`${oldSentence.subject}`) === true && newText.subject === null) {
        newText.subject = 'politique';
      }
      if (/_capital/i.test(`${oldSentence._id}`) === true && newText.subject === null) {
        newText.subject = 'capital';
      }
      if (/_ai/i.test(`${oldSentence._id}`) === true && newText.subject === null) {
        newText.subject = 'ia';
      }
      if (/coloni/i.test(`${oldSentence._id}`) === true && newText.subject === null) {
        newText.subject = 'decolonial';
      }
      if (/_ecolo/i.test(`${oldSentence._id}`) === true && newText.subject === null) {
        newText.subject = 'ecologie';
      }
      if (/_ident/i.test(`${oldSentence._id}`) === true && newText.subject === null) {
        newText.subject = 'identite';
      }
      if (/_politi/i.test(`${oldSentence._id}`) === true && newText.subject === null) {
        newText.subject = 'politique';
      }

      // Clips:
      if (oldSentence.clipw) {
        newText.clip_w = path.basename(oldSentence.clipw);
        if (newText.voice.indexOf('w') === -1) {
          newText.voice.push('w');
        }
      }
      if (oldSentence.clipn) {
        newText.clip_n = path.basename(oldSentence.clipn);
        if (newText.voice.indexOf('n') === -1) {
          newText.voice.push('n');
        }
      }
      if (oldSentence.clipi) {
        newText.clip_i = path.basename(oldSentence.clipi);
        if (newText.voice.indexOf('i') === -1) {
          newText.voice.push('i');
        }
      }
      if (oldSentence.clipe) {
        newText.clip_e = path.basename(oldSentence.clipe);
        if (newText.voice.indexOf('e') === -1) {
          newText.voice.push('e');
        }
      }

      // Voice:
      newText.voice = newText.voice.map((item) => {
        if (item === 'n') {
          return 'naturelle';
        }
        if (item === 'e') {
          return 'emotive';
        }
        if (item === 'i') {
          return 'interrogative';
        }
        return 'murmure';
      });

      // Label:
      let baseId = `${newText.destination.join('+')}`;
      if (newText.bias.length > 0) {
        baseId = `${baseId}_${newText.bias.join('+')}`;
      }
      if (newText.type.length > 0) {
        baseId = `${baseId}_${newText.type.join('+')}`;
      }
      if (newText.subject) {
        baseId = `${baseId}_${newText.subject}`;
      }
      if (newText.voice.length > 0) {
        baseId = `${baseId}_${newText.voice.join('+')}`;
      }

      if (baseIds[baseId] === undefined) {
        baseIds[baseId] = 0;
      }
      baseIds[baseId]++;
      newText.label = `${baseId}_${baseIds[baseId]}`.replace(/_/gim, ' ');

      // Add text to partition:
      if (/\d+_\d+$/.test(`${oldSentence._id}`)) {
        const parts = /^(.+)_(\d+)$/.exec(`${oldSentence._id}`);

        if (partitions[parts[1]] === undefined) {
          partitions[parts[1]] = {
            _id: ObjectId().toString(),
            label: parts[1],
            items: [],
            filter: null,
            author: 'admin',
          };
        }
        partitions[parts[1]].items.push({
          _id: ObjectId().toString(),
          item_id: newText._id,
          old_id: `${oldSentence._id}`,
          type: 'text',
          index: parseInt(parts[2], 10),
        });
      }

      await Database.insertOne('text', newText);
    } else {
      if (oldSentence.pause) {
        const newPause = {
          _id: ObjectId().toString(),
          old_id: `${oldSentence._id}`,
          duration: parseInt(oldSentence.pause, 10),
        };

        // Add pause to partition:
        if (/\d+_\d+$/.test(`${oldSentence._id}`)) {
          const parts = /^(.+)_(\d+)$/.exec(`${oldSentence._id}`);
          if (partitions[parts[1]] === undefined) {
            partitions[parts[1]] = {
              _id: ObjectId().toString(),
              label: parts[1],
              items: [],
              filter: null,
              author: 'admin',
            };
          }
          partitions[parts[1]].items.push({
            _id: ObjectId().toString(),
            item_id: newPause._id,
            old_id: `${oldSentence._id}`,
            type: 'pause',
            index: parseInt(parts[2], 10),
          });
        }

        await Database.insertOne('pause', newPause);
      } else if (/\w_\w+_\w,/.test(oldSentence.text) === true) {
        // Add item to partition:
        if (/\d+_\d+$/.test(`${oldSentence._id}`)) {
          const parts = /^(.+)_(\d+)$/.exec(`${oldSentence._id}`);
          if (partitions[parts[1]] === undefined) {
            partitions[parts[1]] = {
              _id: ObjectId().toString(),
              label: parts[1],
              items: [],
              filter: null,
              author: 'admin',
            };
          }
          const items = `${oldSentence.text}`.trim().split(',');
          let index = 0;
          for (let j = 0; j < items.length; j++) {
            if (items[j] && /undefined/.test(items[j]) === false) {
              if (/\d$/.test(items[j]) === true) {
                partitions[parts[1]].items.push({
                  _id: ObjectId().toString(),
                  item_id: null, // pending...
                  old_id: items[j],
                  type: 'partition',
                  index: index++,
                });
              } else {
                partitions[parts[1]].items.push({
                  _id: ObjectId().toString(),
                  item_id: items[j],
                  old_id: items[j],
                  type: 'partition-item',
                  index: index++,
                });
              }
            }
          }
        }
      }
    }
  }

  for (let partition in partitions) {
    for (let i = 0; i < partitions[partition].items.length; i++) {
      if (
        partitions[partition].items[i].type === 'partition' &&
        partitions[partition].items[i].item_id === null &&
        partitions[partitions[partition].items[i].old_id]
      ) {
        partitions[partition].items[i].item_id = partitions[partitions[partition].items[i].old_id]._id;
      }
    }
  }

  for (let partition in partitions) {
    await Database.insertOne('partition', partitions[partition]);
  }

  process.exit(0);
}

main();
