require('../modules/env');
const { Database } = require('../modules/database');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const srcTextPath = path.resolve(path.join(__dirname, '..', '..', 'sources_txt', 'global'));

async function main() {
  await Database.createIndex('sentence', { destination: 1 });
  await Database.createIndex('sentence', { voice: 1 });
  await Database.createIndex('sentence', { subject: 1 });
  await Database.createIndex('sentence', { type: 1 });
  await Database.createIndex('sentence', { destination: 1, subject: 1 });
  await Database.createIndex('sentence', { destination: 1, subject: 1, type: 1 });
  const files = browseDir(srcTextPath);
  files.sort();
  for (let i = 0; i < files.length; i++) {
    await parseFile(files[i]);
  }
}

function browseDir(dir) {
  const items = fs.readdirSync(dir);
  let files = [];
  const dirs = [];
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    if (item !== '.' && item !== '..') {
      if (fs.lstatSync(path.join(dir, item)).isDirectory()) {
        dirs.push(path.join(dir, item));
      } else if (/\.docx/i.test(item) && (/^superbloc/i.test(item) || /^sb/i.test(item))) {
        files.push(path.join(dir, item));
      }
    }
  }
  for (let i = 0; i < dirs.length; i++) {
    files = files.concat(browseDir(dirs[i]));
  }
  return files;
}

async function parseFile(filePath) {
  try {
    mammoth
      .convertToHtml({
        path: filePath,
        options: {
          includeEmbeddedStyleMap: true,
          includeDefaultStyleMap: true,
          ignoreEmptyParagraphs: false,
        },
      })
      .then(async (result) => {
        const fileName = path.basename(filePath, '.docx');
        console.log(`\n\nfile: [${fileName}]`);
        const destination = [];
        if (/^superbloc_p*ip*_/i.test(fileName) || /^sb_p*ip*_/i.test(fileName)) {
          destination.push('i');
        }
        if (/^superbloc_i*pi*_/i.test(fileName) || /^sb_i*pi*_/i.test(fileName)) {
          destination.push('p');
        }
        const terms = fileName.split('_');
        terms.shift();
        terms.shift();
        let type = undefined;
        let subject = undefined;
        let number = undefined;
        let baseId;
        if (terms.length === 1) {
          number = terms[0];
          baseId = `sb_${destination.join('')}_${number}`;
        } else if (terms.length === 2) {
          type = terms[0];
          number = terms[1];
          baseId = `sb_${destination.join('')}_${[subject, type]
            .filter((item) => {
              return !!item;
            })
            .join('_')}_${number}`;
        } else if (terms.length === 3) {
          type = terms[0];
          subject = terms[1];
          number = terms[2];
          baseId = `sb_${destination.join('')}_${[subject, type]
            .filter((item) => {
              return !!item;
            })
            .join('_')}_${number}`;
        }
        console.log(`id: [${baseId}]`);
        let html = result.value;
        if (/_\w+:\[\[/.test(html)) {
          html = html.replace(/<\/?[^>]+(>|$)/gm, '');
          const pParts = html.split(']]');
          const parts = [];
          const tags = [];
          for (let i = 0; i < pParts.length; i++) {
            const reg = RegExp('#([a-zè+-]+)', 'gmi');
            let match;
            while ((match = reg.exec(pParts[i])) !== null) {
              tags.push(match[1].toLowerCase().replace('è', 'e').trim());
            }
            if (tags.length > 0) {
              pParts[i] = pParts[i].replace(/#([a-zè+-]+)/gim, '').trim();
            }
            if (/^\W?\w+_/.test(pParts[i])) {
              parts.push(
                pParts[i]
                  .replace(/^\W?/gim, '')
                  .replace(/:\[\[.*$/gim, '')
                  .trim(),
              );
            }
          }
          console.log(parts);
          console.log(tags);
          for (let index = 0; index < parts.length; index++) {
            const bloc = await Database.findOne('sentence', { _id: parts[index] });
            if (bloc) {
              const existing = await Database.findOne('sentence', { _id: `${baseId}_${index}` });
              if (existing === null) {
                await Database.insertOne('sentence', {
                  _id: `${baseId}_${index}`,
                  destination: bloc.destination,
                  voice: bloc.voice,
                  subject: bloc.subject,
                  type: bloc.type,
                  pause: bloc.pause,
                  text: bloc.text,
                  tags: tags || bloc.tags,
                  partition: true,
                  clipw: bloc.clipw,
                  clipn: bloc.clipn,
                  clipi: bloc.clipi,
                  clipe: bloc.clipe,
                  clipwtry: bloc.clipwtry,
                  clipntry: bloc.clipntry,
                  clipitry: bloc.clipitry,
                  clipetry: bloc.clipetry,
                });
                console.log('added');
              } else {
                await Database.replaceOne(
                  'sentence',
                  { _id: `${baseId}_${index}` },
                  {
                    _id: `${baseId}_${index}`,
                    destination: bloc.destination,
                    voice: bloc.voice,
                    subject: bloc.subject,
                    type: bloc.type,
                    pause: bloc.pause,
                    text: bloc.text,
                    tags: tags || bloc.tags,
                    partition: true,
                    clipw: bloc.clipw,
                    clipn: bloc.clipn,
                    clipi: bloc.clipi,
                    clipe: bloc.clipe,
                    clipwtry: bloc.clipwtry,
                    clipntry: bloc.clipntry,
                    clipitry: bloc.clipitry,
                    clipetry: bloc.clipetry,
                  },
                );
                console.log('updated');
              }
            } else {
              console.log(`bloc ${parts[index]} not found`);
            }
          }
        } else {
          html = html.replace(/<ol>.*<\/ol>/gim, '');
          const pParts = html.split(/<p>/gim);
          let stack = [];
          const parts = [];
          const context = {
            destination: destination,
            subject: undefined,
            type: undefined,
            voice: undefined,
            pause: undefined,
          };
          let oldContext = JSON.parse(JSON.stringify(context));
          for (let p = 0; p < pParts.length; p++) {
            let part = pParts[p];
            part = part.replace(/<\/?[^>]+(>|$)/gm, '');
            part = part.trim();
            part = part.replace(/\r\n/gim, '\n');
            part = part.replace(/\r/gim, '\n');
            part = part.replace(/\t/gim, '');
            part = part.replace(/\f/gim, '');
            part = part.replace(/[.…]+TAG[.…]+/gm, '');
            part = part.replace(/«\s?/gim, '"');
            part = part.replace(/\s?»/gim, '"');
            part = part.replace(/  +/gm, ' ').trim();
            part = part.replace(/^"/, '');
            part = part.replace(/"$/, '');
            part = part.replace(/^[.…]+/gim, '');
            part = part.replace(/[.…]+$/gim, '');
            part = part.replace(/[.…]*TAG[.…]*/gm, '').trim();
            part = part.replace(/(\w)\s\./gim, '$1.').trim();
            part = part.replace(/(\w)\s,/gim, '$1,').trim();
            part = part.replace(/^"/, '');
            part = part.replace(/"$/, '');
            let isInfo = false;
            let shouldBreak = false;
            if (/^super\s*bloc/i.test(part) === true) {
              isInfo = true;
              context.pause = undefined;
            }
            if (/^[\w\s]*natur\w*\b.*$/i.test(part) || /\bN\b.*$/.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.voice = 'n';
              context.pause = undefined;
            }
            if (/^[\w\s]*wh?isp\w*\b.*$/i.test(part) || /\bW\b.*$/.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.voice = 'w';
              context.pause = undefined;
            }
            if (/^[\w\s]*emo\s?\w*$/i.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.voice = 'e';
              context.pause = undefined;
            }
            if (/^[\w\s]*inter\w*$/i.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.voice = 'i';
              context.pause = undefined;
            }
            if (/^[\w\s]*add?resse?[\w\s]*$/i.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.subject = 'address';
              context.pause = undefined;
              context.type = undefined;
            }
            if (/^.*\bai\s?[\w\s]*$/i.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.subject = 'ai';
              context.pause = undefined;
              context.type = undefined;
            }
            if (/^.*\bid\s?[\w\s]*$/i.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.subject = 'identite';
              context.pause = undefined;
              context.type = undefined;
            }
            if (/^.*\bd[ée]col?o?n?i?a?l?\s?[\w\s]*$/i.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.subject = 'decolonial';
              context.pause = undefined;
              context.type = undefined;
            }
            if (/^.*\bcommentaire\b/i.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.subject = 'commentaire';
              context.pause = undefined;
              context.type = undefined;
            }
            if (/^.*\bdj\b/i.test(part) || /^.*\bdjeune?\b/i.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.subject = 'djeune';
              context.pause = undefined;
              context.type = undefined;
            }
            if ((/\w\sa$/i.test(part) || /\w\sattack\b/i.test(part)) && context.subject !== undefined) {
              isInfo = true;
              shouldBreak = true;
              context.type = 'attack';
              context.pause = undefined;
              context.type = undefined;
            }
            if ((/\w\sr$/i.test(part) || /\w\sresist\b/i.test(part)) && context.subject !== undefined) {
              isInfo = true;
              shouldBreak = true;
              context.type = 'resist';
              context.pause = undefined;
            }
            if (/\btransition\b/i.test(part) && context.subject !== undefined) {
              isInfo = true;
              shouldBreak = true;
              context.type = 'transition';
              context.pause = undefined;
            }
            if (/liaison\s?d[eé]but\b/i.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.subject = 'liaisondebut';
              context.pause = undefined;
              context.type = undefined;
            }
            if (/\bsouffle\s?long\b/i.test(part) && context.subject !== undefined) {
              isInfo = true;
              shouldBreak = true;
              context.type = 'soufflelong';
              context.pause = undefined;
            }
            if (/\bsouffle\s?court\b/i.test(part) && context.subject !== undefined) {
              isInfo = true;
              shouldBreak = true;
              context.type = 'soufflecourt';
              context.pause = undefined;
            }
            if (/pause\b/i.test(part)) {
              isInfo = true;
              shouldBreak = true;
              context.pause = true;
            }
            if (/\d+\s?sec/i.test(part) && context.pause === true) {
              isInfo = true;
              context.pause = parseInt(/(\d+)\s?sec/i.exec(part)[1], 10);
            }
            if (isInfo === false) {
              let breaking = false;
              if (JSON.stringify(context) !== JSON.stringify(oldContext) || shouldBreak === true) {
                breaking = true;
              }
              if (/\w/.test(part) === false) {
                breaking = true;
              }
              if (breaking === true && stack.length > 0) {
                let txt = stack.join('\n').trim();
                if (txt) {
                  parts.push({
                    text: stack.join('\n'),
                    context: oldContext,
                  });
                }
                stack = [];
                stack.push(part);
                oldContext = JSON.parse(JSON.stringify(context));
              } else {
                stack.push(part);
              }
            } else if (context.pause && isNaN(context.pause) === false && context.pause > 1) {
              parts.push({
                text: null,
                context: JSON.parse(JSON.stringify(context)),
              });
              context.pause = undefined;
            }
          }
          if (stack.length > 0) {
            let txt = stack.join('\n').trim();
            if (txt) {
              parts.push({
                text: stack.join('\n'),
                context: oldContext,
              });
            }
          }
          for (let index = 0; index < parts.length; index++) {
            console.log(`${baseId}_${index}`);
            const reg = RegExp('#([a-zè+-]+)', 'gmi');
            let match;
            let tags = [];
            while ((match = reg.exec(parts[index].text)) !== null) {
              tags.push(match[1].toLowerCase().replace('è', 'e').trim());
            }
            if (tags.length > 0) {
              parts[index].text = parts[index].text.replace(/#([a-zè+-]+)/gim, '').trim();
            }
            console.log(parts[index].text);
            const existing = await Database.findOne('sentence', { _id: `${baseId}_${index}` });
            if (existing === null) {
              await Database.insertOne('sentence', {
                _id: `${baseId}_${index}`,
                destination: parts[index].context.destination,
                voice: [parts[index].context.voice],
                subject: parts[index].context.subject,
                type: parts[index].context.type,
                pause: parts[index].context.pause,
                text: parts[index].text,
                tags: tags,
                clipw: null,
                clipn: null,
                clipi: null,
                clipe: null,
                clipwtry: 0,
                clipntry: 0,
                clipitry: 0,
                clipetry: 0,
              });
              console.log('added');
            } else {
              if (
                JSON.stringify(existing.destination) !== JSON.stringify(parts[index].context.destination) ||
                JSON.stringify(existing.voice) !== JSON.stringify([parts[index].context.voice]) ||
                JSON.stringify(existing.subject) !== JSON.stringify(parts[index].context.subject) ||
                JSON.stringify(existing.type) !== JSON.stringify(parts[index].context.type) ||
                JSON.stringify(existing.text) !== JSON.stringify(parts[index].text) ||
                JSON.stringify(existing.tags) !== JSON.stringify(tags)
              ) {
                if (JSON.stringify(existing.text) !== JSON.stringify(parts[index].text)) {
                  await Database.replaceOne(
                    'sentence',
                    { _id: `${baseId}_${index}` },
                    {
                      _id: `${baseId}_${index}`,
                      destination: parts[index].context.destination,
                      voice: [parts[index].context.voice],
                      subject: parts[index].context.subject,
                      type: parts[index].context.type,
                      pause: parts[index].context.pause,
                      text: parts[index].text,
                      tags: tags,
                      clipw: null,
                      clipn: null,
                      clipi: null,
                      clipe: null,
                      clipwtry: 0,
                      clipntry: 0,
                      clipitry: 0,
                      clipetry: 0,
                    },
                  );
                  console.log('updated (reset clips)');
                } else {
                  await Database.replaceOne(
                    'sentence',
                    { _id: `${baseId}_${index}` },
                    {
                      _id: `${baseId}_${index}`,
                      destination: parts[index].context.destination,
                      voice: [parts[index].context.voice],
                      subject: parts[index].context.subject,
                      type: parts[index].context.type,
                      pause: parts[index].context.pause,
                      text: parts[index].text,
                      tags: tags,
                      clipw: existing.clipw,
                      clipn: existing.clipn,
                      clipi: existing.clipe,
                      clipe: existing.clipe,
                      clipwtry: existing.clipwtry,
                      clipntry: existing.clipntry,
                      clipitry: existing.clipitry,
                      clipetry: existing.clipetry,
                    },
                  );
                  console.log('updated (keep clips)');
                }
              } else {
                console.log('skipped');
              }
            }
          }
        }
      })
      .done(() => {
        return true;
      });
  } catch (err) {
    console.log(err);
    return false;
  }
}

main();
