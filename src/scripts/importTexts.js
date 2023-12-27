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
  files.forEach(async (file) => {
    await parseFile(file);
  });
}

function browseDir(dir) {
  const items = fs.readdirSync(dir);
  let files = [];
  const dirs = [];
  items.forEach((item) => {
    if (item !== '.' && item !== '..') {
      if (fs.lstatSync(path.join(dir, item)).isDirectory()) {
        dirs.push(path.join(dir, item));
      } else if (
        /\.docx/i.test(item) &&
        /^x/i.test(item) === false &&
        /^superbloc/i.test(item) === false &&
        /^sb/i.test(item) === false &&
        /^bloc/i.test(item) === false
      ) {
        files.push(path.join(dir, item));
      }
    }
  });
  dirs.forEach((dir) => {
    files = files.concat(browseDir(dir));
  });
  return files;
}

async function parseFile(filePath) {
  try {
    mammoth
      .convertToHtml({ path: filePath })
      .then(async (result) => {
        const fileName = path.basename(filePath, '.docx');
        console.log(`file: [${fileName}]`);
        const destination = [];
        if (/^p*ip*_/i.test(fileName)) {
          destination.push('i');
        }
        if (/^i*pi*_/i.test(fileName)) {
          destination.push('p');
        }
        destination.sort();
        const voice = [];
        if (/_[nie]*w[nie]*$/i.test(fileName)) {
          voice.push('w');
        }
        if (/_[wie]*n[wie]*$/i.test(fileName)) {
          voice.push('n');
        }
        if (/_[nwe]*i[nwe]*$/i.test(fileName)) {
          voice.push('i');
        }
        if (/_[niw]*e[niw]*$/i.test(fileName)) {
          voice.push('e');
        }
        voice.sort();
        const terms = fileName.split('_');
        terms.pop();
        terms.shift();
        const subject = terms[0];
        const type = terms[1];
        const baseId = `${destination.join('')}_${[subject, type]
          .filter((item) => {
            return !!item;
          })
          .join('_')}_${voice.join('')}`;
        const html = result.value;
        if (/<li>/gim.test(html) === true) {
          const liParts = html.split(/<li>/gim);
          for (let index = 0; index < liParts.length; index++) {
            let part = liParts[index];
            part = part.replace(/<\/?[^>]+(>|$)/gm, '');
            part = part.replace(/\r\n/gim, '\n');
            part = part.replace(/\r/gim, '\n');
            part = part.replace(/\t/gim, '');
            part = part.replace(/\f/gim, '');
            part = part.replace(/  +/gm, ' ').trim();
            const reg = RegExp('#([a-zè+-]+)', 'gmi');
            let match;
            let tags = [];
            while ((match = reg.exec(part)) !== null) {
              tags.push(match[1].toLowerCase().replace('è', 'e').trim());
            }
            if (tags.length > 0) {
              part = part.replace(/#([a-zè+-]+)/gim, '').trim();
            }
            if (part) {
              console.log(`text: ${baseId}_${index}`);
              const existing = await Database.findOne('sentence', { _id: `${baseId}_${index}` });
              if (existing === null) {
                await Database.insertOne('sentence', {
                  _id: `${baseId}_${index}`,
                  destination: destination,
                  voice: voice,
                  subject: subject,
                  type: type,
                  text: part,
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
                  JSON.stringify(existing.destination) !== JSON.stringify(destination) ||
                  JSON.stringify(existing.voice) !== JSON.stringify(voice) ||
                  JSON.stringify(existing.subject) !== JSON.stringify(subject) ||
                  JSON.stringify(existing.type) !== JSON.stringify(type) ||
                  JSON.stringify(existing.text) !== JSON.stringify(part) ||
                  JSON.stringify(existing.tags) !== JSON.stringify(tags)
                ) {
                  if (JSON.stringify(existing.text) !== JSON.stringify(part)) {
                    await Database.replaceOne(
                      'sentence',
                      { _id: `${baseId}_${index}` },
                      {
                        _id: `${baseId}_${index}`,
                        destination: destination,
                        voice: voice,
                        subject: subject,
                        type: type,
                        text: part,
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
                        destination: destination,
                        voice: voice,
                        subject: subject,
                        type: type,
                        text: part,
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
        } else if (/<th>/gim.test(html) === true) {
          const thParts = html.split(/<th>/gim);
          for (let index = 0; index < thParts.length; index++) {
            let part = thParts[index];
            let auth = '';
            let text = '';
            let tags = [];
            part = part.replace(/<\/?[^>]+(>|$)/gm, '');
            part = part.replace(/\r\n/gim, '\n');
            part = part.replace(/\r/gim, '\n');
            part = part.replace(/\t/gim, '');
            part = part.replace(/\f/gim, '');
            part = part.replace(/[.…]+TAG[.…]+/gm, '');
            part = part.replace(/«\s?/gim, '"');
            part = part.replace(/\s?»/gim, '"');
            part = part.replace(/  +/gm, ' ').trim();
            if (part) {
              if (/source\s?:/gim.test(part) === true) {
                part = part.split(/source\s?:/gim);
                if (part[0].trim() === '') {
                  part = part[1].split(':');
                  text = part.slice(1).join(':').trim();
                  auth = part[0].trim();
                } else {
                  text = part[0].trim();
                  auth = part[1].trim();
                }
              }
              if (/\WTAG\W/gm.test(text) === true) {
                tags = text.split(/[.…]+TAG/gm);
                text = tags[0];
                tags = tags[1].split(/[,#]/);
              } else if (/\WTAG\W/gm.test(auth) === true) {
                tags = auth.split(/[.…]+TAG/gm);
                auth = tags[0];
                tags = tags[1].split(/[,#]/);
              }
              text = text.replace(/^"/, '');
              text = text.replace(/"$/, '');
              text = text.replace(/^[.…]+/gim, '');
              text = text.replace(/[.…]+$/gim, '');
              if (text) {
                text = `${text}.`.replace(/([.?!;])\s?\.$/gim, '$1');
              }
              auth = auth.split(',')[0];
              auth = auth.replace(/^[.…]+/gim, '');
              auth = auth.replace(/[.…]+$/gim, '');
              if (auth === '' && text === '') {
                tags = part.split('#');
                text = tags[0].trim();
                text = text.replace(/^"/, '');
                text = text.replace(/"$/, '').trim();
                text = text.replace(/^[.…]+/gim, '').trim();
                text = text.replace(/[.…]+$/gim, '').trim();
                if (text) {
                  text = `${text}.`.replace(/([.?!;])\.$/gim, '$1').trim();
                }
                tags = tags.slice(1);
              }
              text = text.replace(/[.…]*TAG[.…]*/gm, '').trim();
              text = text.replace(/(\w)\s\./gim, '$1.').trim();
              text = text.replace(/(\w)\s,/gim, '$1,').trim();
              text = text.replace(/^"/, '');
              text = text.replace(/"$/, '');
              tags = tags
                .map((item) => {
                  return `${item}`.replace(/[#.…]/gim, '').trim();
                })
                .filter((item) => {
                  return item.length > 2;
                })
                .filter((value, index, self) => {
                  return self.indexOf(value) === index;
                });
              console.log(`text: ${baseId}_${index}`);
            }
          }
        } else {
          const pParts = html.split(/<p>/gim);
          const parts = [];
          let current = '';
          pParts.forEach((part) => {
            part = part.replace(/<\/?[^>]+(>|$)/gm, '');
            part = part.trim();
            if (/^\d+\./.test(part)) {
              if (current !== '') {
                current = current.replace(/\r\n/gim, '\n');
                current = current.replace(/\r/gim, '\n');
                current = current.replace(/\t/gim, '');
                current = current.replace(/\f/gim, '');
                current = current.replace(/[.…]+TAG[.…]+/gm, '');
                current = current.replace(/«\s?/gim, '"');
                current = current.replace(/\s?»/gim, '"');
                current = current.replace(/  +/gm, ' ').trim();
                current = current.replace(/^"/, '');
                current = current.replace(/"$/, '');
                current = current.replace(/^[.…]+/gim, '');
                current = current.replace(/[.…]+$/gim, '');
                current = `${current}.`.replace(/([.?!;])\s?\.$/gim, '$1');
                current = current.replace(/[.…]*TAG[.…]*/gm, '').trim();
                current = current.replace(/(\w)\s\./gim, '$1.').trim();
                current = current.replace(/(\w)\s,/gim, '$1,').trim();
                current = current.replace(/^"/, '');
                current = current.replace(/"$/, '');
                if (current.length > 2) {
                  parts.push(current);
                }
                current = '';
              }
            }
            current += ' ' + part.replace(/^\d+\.\s?/, '').trim();
          });
          if (current !== '') {
            current = current.replace(/\r\n/gim, '\n');
            current = current.replace(/\r/gim, '\n');
            current = current.replace(/\t/gim, '');
            current = current.replace(/\f/gim, '');
            current = current.replace(/[.…]+TAG[.…]+/gm, '');
            current = current.replace(/«\s?/gim, '"');
            current = current.replace(/\s?»/gim, '"');
            current = current.replace(/  +/gm, ' ').trim();
            current = current.replace(/^"/, '');
            current = current.replace(/"$/, '');
            current = current.replace(/^[.…]+/gim, '');
            current = current.replace(/[.…]+$/gim, '');
            current = `${current}.`.replace(/([.?!;])\s?\.$/gim, '$1');
            current = current.replace(/[.…]*TAG[.…]*/gm, '').trim();
            current = current.replace(/(\w)\s\./gim, '$1.').trim();
            current = current.replace(/(\w)\s,/gim, '$1,').trim();
            current = current.replace(/^"/, '');
            current = current.replace(/"$/, '');
            parts.push(current.trim());
          }
          for (let index = 0; index < parts.length; index++) {
            let part = parts[index];
            if (part && part !== '.') {
              console.log(`text: ${baseId}_${index}`);
              const existing = await Database.findOne('sentence', { _id: `${baseId}_${index}` });
              if (existing === null) {
                await Database.insertOne('sentence', {
                  _id: `${baseId}_${index}`,
                  destination: destination,
                  voice: voice,
                  subject: subject,
                  type: type,
                  text: part,
                  clipw: null,
                  clipn: null,
                  clipi: null,
                  clipe: null,
                  clipwtry: 0,
                  clipntry: 0,
                  clipitry: 0,
                  clipetry: 0,
                });
                console.log('stored');
              } else {
                console.log('existing');
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
