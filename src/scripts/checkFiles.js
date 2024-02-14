require('../modules/env');
const { Database } = require('../modules/database');
const path = require('path');
const fs = require('fs');

async function main() {
  const sentences = await Database.find('sentence', {clipw: {$ne: null}});
  let count = 0;
  for (const sentence of sentences) {
    const filename = path.join(__dirname, '..', '..', 'public', 'runtime', path.basename(sentence.clipw));
    const exists = fs.existsSync(filename);
    if (!exists) {
      console.log(`Warning : missing file ${path.basename(sentence.clipw)}`);
      count++;
    }
  }
  console.log(`Verified ${sentences.length} files, ${count} problems found`);
  process.exit(0);
}

main();
