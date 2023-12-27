require('../modules/env');
const { Database } = require('../modules/database');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { program } = require('commander');

async function main() {
  program.option('-l, --login <string>');
  program.parse();
  const options = program.opts();

  try {
    const user = await Database.findOne('users', { login: options.login });
    if (user) {
      user.password = await argon2.hash(user.password);
      const token = jwt.sign(user, process.env.SECRET, { expiresIn: '10y' });
      console.log(`http://io-io-io.io:3200/login?token=${token}`);
    }
  } catch (err) {
    console.log(err);
  }
}

main();
