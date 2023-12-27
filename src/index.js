const { Server } = require('./modules/server');
const { Resemble } = require('./modules/resemble');

async function main() {
  const server = new Server(Resemble);
  await server.run();
  console.log(`SpeakBlue server is running...`);
}

main();
