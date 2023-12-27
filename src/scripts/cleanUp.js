require('../modules/env');
const { Database } = require('../modules/database');
const { Resemble } = require('../modules/resemble');
const { DateTime } = require('luxon');
const path = require('path');
const fs = require('fs');

async function main() {
  let counter = 0;
  try {
    const now = DateTime.now();
    const clips = await Resemble.getAllClips();
    for (let i = 0; i < clips.items.length; i++) {
      const then = DateTime.fromISO(clips.items[i].created_at);
      const diff = now.diff(then, 'weeks');
      if (diff.weeks > 1) {
        counter++;
        console.log(counter, clips.items[i].uuid, then.toLocaleString({ locale: 'fr' }));
        await Resemble.delete(clips.items[i].uuid);
      }
    }

    const dbClips = await Database.find('clips', {});
    for (let i = 0; i < dbClips.length; i++) {
      const filename = path.join(__dirname, '..', '..', 'public', 'clips', dbClips[i].filename);
      const exists = fs.existsSync(filename);
      if (exists === false) {
        console.log(dbClips[i].filename);
        await Database.deleteOne('clips', { _id: dbClips[i]._id });
      }
    }
  } catch (err) {
    console.log(err);
  }
}

main();
