require('../modules/env');
const { Database } = require('../modules/database');

async function main() {
  await Database.createIndex('sentence', { destination: 1 });
  await Database.createIndex('sentence', { voice: 1 });
  await Database.createIndex('sentence', { subject: 1 });
  await Database.createIndex('sentence', { type: 1 });
  await Database.createIndex('sentence', { destination: 1, subject: 1 });
  await Database.createIndex('sentence', { destination: 1, subject: 1, type: 1 });
}

main();
