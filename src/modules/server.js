require('./env');
const { decode } = require('html-entities');
const { Database, ObjectId } = require('./database');
const argon2 = require('argon2');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const needle = require('needle');
const nodemailer = require('nodemailer');

class Server {
  constructor(Resemble) {
    if (!this.app) {
      const http = require('http');
      const express = require('express');
      const cookieParser = require('cookie-parser');
      const { Server } = require('socket.io');
      this.app = express();
      this.httpServer = http.createServer(this.app);
      this.io = new Server(this.httpServer);
      this.transporter = nodemailer.createTransport({
        service: 'GandiMail',
        auth: {
          user: 'io@io-io-io.io',
          pass: process.env.SMTPPWD,
        },
      });

      this.auth = async (req, res, next) => {
        if (
          /^\/saveAnonymousText/.test(req.url) ||
          /^\/saveAuthenticatedText/.test(req.url) ||
          /^\/partition/.test(req.url) ||
          /^\/runtime/.test(req.url) ||
          /^\/blocs/.test(req.url) ||
          /^\/speak/.test(req.url) ||
          /^\/clips\//.test(req.url) ||
          /\.webmanifest$/i.test(req.url) ||
          /\.ico$/i.test(req.url) ||
          /\.png$/i.test(req.url) ||
          /\.ttf$/i.test(req.url) ||
          /\.woff$/i.test(req.url) ||
          /\.woff2$/i.test(req.url) ||
          /\.svg$/i.test(req.url) ||
          /\.css$/i.test(req.url) ||
          /\.js$/i.test(req.url) ||
          /\.wav$/i.test(req.url) ||
          /help/i.test(req.url) ||
          /^\/login\?token=/.test(req.url)
        ) {
          return next();
        }
        try {
          const token = req.cookies.token;
          const decoded = jwt.verify(token, process.env.SECRET);
          const user = await Database.findOne('users', { login: decoded.login });
          if (await argon2.verify(decoded.password, user.password)) {
            res.clearCookie('anonymous');
            res.cookie('uid', user._id.toString(), { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
            res.cookie('username', user.name, { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
            res.cookie('isadmin', user.admin === true, { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
            if (
              user.author === true &&
              (/^\/#?$/.test(req.url) === true || /^\/index\.html#?$/.test(req.url) === true)
            ) {
              res.redirect('/text.html');
            } else {
              next();
            }
          } else {
            throw 'Invalid user token';
          }
        } catch {
          if (/\/text/i.test(req.url)) {
            res.clearCookie('uid');
            res.clearCookie('username');
            res.clearCookie('isadmin');
            res.clearCookie('token');
            res.cookie('anonymous', true, { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
            next();
          } else {
            res.status(401).send('Unauthorized');
          }
        }
      };

      this.app.use(cookieParser());
      this.app.use(express.json({ limit: '100mb' }));
      this.app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 100000 }));
      this.app.use(this.auth);
      this.app.use(express.static(path.join(__dirname, '..', '..', 'public')));
      this.Resemble = Resemble;

      this.clipQueue = [];
      this.clipQueueInterval = setInterval(async () => {
        const newQueue = [];
        for (let i = 0; i < this.clipQueue.length; i++) {
          this.clipQueue[i].lifespan--;
          if (this.clipQueue[i].lifespan > 0) {
            if (
              this.clipQueue[i].locked === false &&
              this.clipQueue[i].clipInfo &&
              this.clipQueue[i].clipInfo.item &&
              this.clipQueue[i].clipInfo.item.uuid
            ) {
              this.clipQueue[i].locked === true;

              const clipStatus = await this.Resemble.getClip(this.clipQueue[i].clipInfo.item.uuid);

              if (clipStatus && clipStatus.success && clipStatus.item && clipStatus.item.audio_src) {
                const clipId = this.clipQueue[i].clipId;
                const myID = this.clipQueue[i].myID;
                const clipUrl = clipStatus.item.audio_src;
                const clipHash = this.clipQueue[i].hash;
                const presetId = this.clipQueue[i].presetId;
                const clipFileName = `${this.clipQueue[i].clipId}.wav`;
                setTimeout(() => {
                  needle.get(
                    clipUrl,
                    { follow_max: 10, output: path.join(__dirname, '..', '..', 'public', 'clips', clipFileName) },
                    async (err, resp, body) => {
                      if (err) {
                        this.io.emit('clip', {
                          success: false,
                          clipId: clipId,
                          myID: myID,
                          presetId: presetId,
                        });
                      } else if (typeof body === 'object' && Buffer.isBuffer(body) === false) {
                        setTimeout(() => {
                          needle.get(
                            clipUrl,
                            {
                              follow_max: 10,
                              output: path.join(__dirname, '..', '..', 'public', 'clips', clipFileName),
                            },
                            async (err, resp, body) => {
                              if (err || (typeof body === 'object' && Buffer.isBuffer(body) === false)) {
                                this.io.emit('clip', {
                                  success: false,
                                  clipId: clipId,
                                  myID: myID,
                                  presetId: presetId,
                                });
                              } else {
                                const existing = await Database.findOne('clips', { hash: clipHash });
                                if (existing) {
                                  existing.clipId = clipId;
                                  existing.url = clipUrl;
                                  existing.filename = clipFileName;
                                  await Database.replaceOne('clips', { _id: existing._id }, existing);
                                } else {
                                  await Database.insertOne('clips', {
                                    clipId: clipId,
                                    hash: clipHash,
                                    url: clipUrl,
                                    filename: clipFileName,
                                  });
                                }
                                this.io.emit('clip', {
                                  success: true,
                                  clipId: clipId,
                                  myID: myID,
                                  presetId: presetId,
                                  clipFileName: clipFileName,
                                });
                              }
                            },
                          );
                        }, 10000);
                      } else {
                        const existing = await Database.findOne('clips', { hash: clipHash });
                        if (existing) {
                          existing.clipId = clipId;
                          existing.url = clipUrl;
                          existing.filename = clipFileName;
                          await Database.replaceOne('clips', { _id: existing._id }, existing);
                        } else {
                          await Database.insertOne('clips', {
                            clipId: clipId,
                            hash: clipHash,
                            url: clipUrl,
                            filename: clipFileName,
                          });
                        }
                        this.io.emit('clip', {
                          success: true,
                          clipId: clipId,
                          myID: myID,
                          presetId: presetId,
                          clipFileName: clipFileName,
                        });
                      }
                    },
                  );
                }, 1000);
              } else {
                this.clipQueue[i].locked = false;
                let found = false;
                newQueue.forEach((item) => {
                  if (item.clipId === this.clipQueue[i].clipId) {
                    found = true;
                  }
                });
                if (found === false) {
                  newQueue.push(this.clipQueue[i]);
                }
              }
            } else {
              let found = false;
              newQueue.forEach((item) => {
                if (item.clipId === this.clipQueue[i].clipId) {
                  found = true;
                }
              });
              if (found === false) {
                newQueue.push(this.clipQueue[i]);
              }
            }
          }
        }
        this.clipQueue = newQueue;
      }, 1000);
      this.setRoutes();
    }
  }

  setRoutes() {
    this.app.get('/login', async (req, res) => {
      if (req.query.token) {
        try {
          const decoded = jwt.verify(req.query.token, process.env.SECRET);
          const user = await Database.findOne('users', { login: decoded.login });
          if (await argon2.verify(decoded.password, user.password)) {
            res.clearCookie('anonymous');
            res.cookie('uid', user._id.toString(), { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
            res.cookie('username', user.name, { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
            res.cookie('isadmin', user.admin === true, { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
            res.cookie('token', req.query.token, { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
            if (user.author === true) {
              res.redirect('/text.html');
            } else {
              res.redirect('/');
            }
          } else {
            throw 'Invalid user token';
          }
        } catch {
          res.clearCookie('uid');
          res.clearCookie('username');
          res.clearCookie('isadmin');
          res.clearCookie('token');
          res.status(401).send('Unauthorized');
        }
      } else {
        res.status(401).send('Unauthorized');
      }
    });

    this.app.get('/presets', async (req, res) => {
      try {
        const list = [];
        const users = await Database.find('users', {});
        for (let i = 0; i < users.length; i++) {
          list.push({ id: `${users[i]._id}`, name: users[i].name, presets: [] });
        }
        list.sort((a, b) => {
          return `${a.name}` < `${b.name}` ? -1 : `${a.name}` > `${b.name}` ? 1 : 0;
        });
        const presets = await Database.find('presets', {});
        for (let i = 0; i < presets.length; i++) {
          for (let j = 0; j < list.length; j++) {
            if (list[j].id === `${presets[i].creator}`) {
              list[j].presets.push(presets[i]);
            }
          }
        }
        for (let j = 0; j < list.length; j++) {
          list[j].presets.sort((a, b) => {
            return `${a.name}` < `${b.name}` ? -1 : `${a.name}` > `${b.name}` ? 1 : 0;
          });
        }
        res.status(200).send(list);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.app.get('/texts', async (req, res) => {
      try {
        const list = [];
        const user = await Database.findOne('users', { _id: ObjectId(req.cookies.uid) });
        const users = await Database.find('users', {});
        for (let i = 0; i < users.length; i++) {
          if (`${users[i]._id}` === `${user._id}` || user.admin === true) {
            list.push({ id: `${users[i]._id}`, name: users[i].name, texts: [] });
          }
        }
        list.sort((a, b) => {
          return `${a.name}` < `${b.name}` ? -1 : `${a.name}` > `${b.name}` ? 1 : 0;
        });
        const texts = await Database.find('texts', {});
        for (let i = 0; i < texts.length; i++) {
          for (let j = 0; j < list.length; j++) {
            if (list[j].id === `${texts[i].creator}`) {
              list[j].texts.push(texts[i]);
            }
          }
        }
        for (let j = 0; j < list.length; j++) {
          list[j].texts.sort((a, b) => {
            return `${a.title}` < `${b.title}` ? -1 : `${a.title}` > `${b.title}` ? 1 : 0;
          });
        }
        res.status(200).send(list);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.app.post('/saveAuthenticatedText', async (req, res) => {
      try {
        let data = req.body.data;
        if (data.title && data.text && data.name && data.email) {
          data.name = `${data.name}`.trim();
          data.email = `${data.email}`.trim().toLowerCase();
          const existingUser = await Database.findOne('users', { $or: [{ name: data.name, email: data.email }] });
          if (existingUser === null) {
            let user = {
              name: data.name,
              login: data.name.toLowerCase().replace(/\W/gim, '_'),
              password: data.name.toLowerCase().replace(/\W/gim, '_') + '_speak2022blue',
              email: data.email,
              admin: false,
              author: true,
              locked: false,
            };
            const insertResult = await Database.insertOne('users', user);
            user._id = insertResult.insertedId;
            let doc = {
              title: data.title,
              text: data.text,
              tags: [],
              published: false,
              locked: false,
              creator: user._id,
            };
            await Database.insertOne('texts', doc);
            user.password = await argon2.hash(user.password);
            const token = jwt.sign(user, process.env.SECRET, { expiresIn: '10y' });
            const magicUrl = `http://io-io-io.io:3200/login?token=${token}`;
            await this.transporter.sendMail({
              from: '"#SpeakBlue" <io@io-io-io.io>',
              to: data.email,
              subject: `#SpeakBlue : lien personnel pour l'édition des textes (information à conserver).`,
              text: `Bonjour ${data.name},\nVoici le lien permanent et personnel sur lequel vous devez cliquer (ou que vous devez copier-coller dans votre navigateur) afin d'accéder à l'interface authentifiée d'édition des textes pour le projet #SpeakBlue : ${magicUrl}.\nAucun identifiant ni aucun mot de passe ne vous seront demandés.\nVeuillez conserver ce lien précieusement et le limiter à votre propre usage.\nMerci pour votre contribution au projet #SpeakBlue.`,
              html: `<p>Bonjour ${data.name},</p>
                <p>Voici le lien <i>permanent et personnel</i> sur lequel vous devez cliquer afin d'accéder à l'interface authentifiée d'édition des textes pour le projet #SpeakBlue : <a href="${magicUrl}" target="_blank">lien permanent et personnel</a>.</p>
                <p>Aucun identifiant ni aucun mot de passe ne vous seront demandés.</p>
                <p><i>Veuillez conserver ce lien précieusement et le limiter à votre propre usage.</i></p>
                <p>Merci pour votre contribution au projet #SpeakBlue.</p>`,
            });
          } else {
            throw new Error('existing user: ' + JSON.stringify(existingUser));
          }
        } else {
          throw new Error('invalid data: ' + JSON.stringify(data));
        }
        res.status(200).send({
          done: true,
        });
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.app.post('/saveAnonymousText', async (req, res) => {
      try {
        let result = {};
        let data = req.body.data;
        if (data.title && data.text) {
          let doc = {
            title: data.title,
            text: data.text,
            tags: [],
            published: false,
            locked: false,
            creator: ObjectId(process.env.ANOID),
          };
          await Database.insertOne('texts', doc);
          result = {
            inserted: true,
          };
        } else {
          throw new Error('invalid data: ' + JSON.stringify(data));
        }
        res.status(200).send(result);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.app.post('/savePreset', async (req, res) => {
      try {
        let result = {};
        let data = req.body;
        if (data.init && data.init._id && data.current) {
          if (/new_/.test(data.init._id)) {
            let doc = {
              name: data.current.name,
              voice: data.current.voice,
              pitch: parseInt(data.current.pitch, 10),
              volume: parseInt(data.current.volume, 10),
              rate: parseInt(data.current.rate, 10),
              tags: Array.isArray(data.current.tags) ? data.current.tags : [],
              locked: data.init.locked === 'true' || data.init.locked === true,
              fav: data.current.fav === 'true' || data.current.fav === true,
              creator: ObjectId(data.init.creator),
              text: data.text,
            };
            const insertResult = await Database.insertOne('presets', doc);
            doc._id = insertResult.insertedId;
            result = {
              inserted: true,
              doc: doc,
            };
          } else {
            const existing = await Database.findOne('presets', { _id: ObjectId(data.init._id) });
            const doc = {
              _id: ObjectId(data.init._id),
              name: data.current.name,
              voice: data.current.voice,
              pitch: parseInt(data.current.pitch, 10),
              volume: parseInt(data.current.volume, 10),
              rate: parseInt(data.current.rate, 10),
              tags: Array.isArray(data.current.tags) ? data.current.tags : [],
              locked: data.init.locked === 'true' || data.init.locked === true,
              fav: data.current.fav === 'true' || data.current.fav === true,
              creator: ObjectId(data.init.creator),
              text: data.text,
            };
            if (existing !== null) {
              await Database.replaceOne('presets', { _id: doc._id }, doc);
              result = {
                updated: true,
                doc: doc,
              };
            } else {
              await Database.insertOne('presets', doc);
              result = {
                inserted: true,
                doc: doc,
              };
            }
          }
        } else {
          throw new Error('invalid data: ' + JSON.stringify(data));
        }
        res.status(200).send(result);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.app.post('/saveText', async (req, res) => {
      try {
        let result = {};
        let data = req.body.data;
        if (data.id && data.initData && data.currentData) {
          if (/new_/.test(data.id)) {
            let doc = {
              title: data.currentData.title,
              text: data.currentData.text,
              tags: Array.isArray(data.currentData.tags) ? data.currentData.tags : [],
              published: data.published === 'true' || data.published === true,
              locked: data.locked === 'true' || data.locked === true,
              creator: ObjectId(data.creator),
            };
            const insertResult = await Database.insertOne('texts', doc);
            doc._id = insertResult.insertedId;
            result = {
              inserted: true,
              doc: doc,
            };
          } else {
            const doc = {
              _id: ObjectId(data.id),
              title: data.currentData.title,
              text: data.currentData.text,
              tags: Array.isArray(data.currentData.tags) ? data.currentData.tags : [],
              published: data.published === 'true' || data.published === true,
              locked: data.locked === 'true' || data.locked === true,
              creator: ObjectId(data.creator),
            };
            await Database.replaceOne('texts', { _id: doc._id }, doc);
            result = {
              updated: true,
              doc: doc,
            };
          }
        } else {
          throw new Error('invalid data: ' + JSON.stringify(data));
        }
        res.status(200).send(result);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.app.post('/dup', async (req, res) => {
      try {
        let result = {};
        let data = req.body;
        if (data.id && data.myUID) {
          const doc = await Database.findOne('presets', { _id: ObjectId(data.id) });
          if (doc) {
            delete doc._id;
            doc.name = doc.name.replace(/ \(copie \d+\)/, '');
            const others = await Database.find('presets', { name: new RegExp(`^${doc.name} \\(copie \\d+\\)`) });
            doc.name = `${doc.name} (copie ${others.length + 1})`;
            doc.locked = false;
            doc.fav = false;
            doc.creator = ObjectId(data.myUID);
            const insertResult = await Database.insertOne('presets', doc);
            doc._id = insertResult.insertedId;
            result = {
              inserted: true,
              doc: doc,
            };
          } else {
            throw new Error('invalid data: ' + JSON.stringify(data));
          }
        } else {
          throw new Error('invalid data: ' + JSON.stringify(data));
        }
        res.status(200).send(result);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.app.post('/sup', async (req, res) => {
      try {
        let result = {};
        let data = req.body;
        if (data.id && data.myUID) {
          const doc = await Database.findOne('presets', { _id: ObjectId(data.id) });
          if (doc && `${doc.creator}` === data.myUID) {
            await Database.deleteOne('presets', { _id: doc._id });
            result = {
              deleted: true,
            };
          } else {
            throw new Error('invalid data: ' + JSON.stringify(data));
          }
        } else {
          throw new Error('invalid data: ' + JSON.stringify(data));
        }
        res.status(200).send(result);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.app.post('/duptext', async (req, res) => {
      try {
        let result = {};
        let data = req.body;
        if (data.id && data.myUID) {
          const doc = await Database.findOne('texts', { _id: ObjectId(data.id) });
          if (doc) {
            delete doc._id;
            doc.title = doc.title.replace(/ \(copie \d+\)/, '');
            const others = await Database.find('texts', { title: new RegExp(`^${doc.title} \\(copie \\d+\\)`) });
            doc.title = `${doc.title} (copie ${others.length + 1})`;
            doc.locked = false;
            doc.published = false;
            doc.creator = ObjectId(data.myUID);
            const insertResult = await Database.insertOne('texts', doc);
            doc._id = insertResult.insertedId;
            result = {
              inserted: true,
              doc: doc,
            };
          } else {
            throw new Error('invalid data: ' + JSON.stringify(data));
          }
        } else {
          throw new Error('invalid data: ' + JSON.stringify(data));
        }
        res.status(200).send(result);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.app.post('/suptext', async (req, res) => {
      try {
        let result = {};
        let data = req.body;
        if (data.id && data.myUID) {
          const doc = await Database.findOne('texts', { _id: ObjectId(data.id) });
          if (doc && `${doc.creator}` === data.myUID) {
            await Database.deleteOne('texts', { _id: doc._id });
            result = {
              deleted: true,
            };
          } else {
            throw new Error('invalid data: ' + JSON.stringify(data));
          }
        } else {
          throw new Error('invalid data: ' + JSON.stringify(data));
        }
        res.status(200).send(result);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.app.post('/blocs', async (req, res) => {
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

    this.app.post('/partition', async (req, res) => {
      try {
        const clips = [];
        const partition = req.body.partition;
        const history = req.body.history || [];
        const requiredTags = req.body.tags || [];

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
              } else if (sb[j].clipw) {
                clips.push({
                  _id: sb[j]._id,
                  clip: path.basename(sb[j].clipw),
                  text: sb[j].text,
                });
              } else if (sb[j].clipn) {
                clips.push({
                  _id: sb[j]._id,
                  clip: path.basename(sb[j].clipn),
                  text: sb[j].text,
                });
              } else if (sb[j].clipe) {
                clips.push({
                  _id: sb[j]._id,
                  clip: path.basename(sb[j].clipe),
                  text: sb[j].text,
                });
              } else if (sb[j].clipi) {
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
                if (one[`clip${partition[i].voice}`]) {
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
              if (requiredTags.length > 0) {
                partition[i].tags = requiredTags[0];
              }
              console.log(partition[i]);
              candidates = await Database.find('sentence', partition[i]);
              candidates = candidates
                .map((value) => ({ value, sort: Math.random() }))
                .sort((a, b) => a.sort - b.sort)
                .map(({ value }) => value);
              for (let j = 0; j < candidates.length; j++) {
                if (found === false && history.indexOf(candidates[j]._id) === -1) {
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
              if (found === false && candidates[0]) {
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

    this.app.post('/speak', async (req, res) => {
      const response = { success: false };
      const xml = [];
      const clipId = uuidv4();
      const voiceId = this.Resemble.getVoiceByEmotion(req.body.params.voice);
      const pitch = this.Resemble.getPitchByNumericValue(parseInt(req.body.params.pitch, 10));
      const volume = this.Resemble.getVolumeByNumericValue(parseInt(req.body.params.volume, 10));
      const rate = this.Resemble.getRateByNumericValue(parseInt(req.body.params.rate, 10));

      let textToSpeak = decode(req.body.text);
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

      console.log(`[${textToSpeak}] ${req.body.params.voice}/${req.body.params.rate}%`);

      xml.push(`<speak>`);
      xml.push(`<voice name="${voiceId}" uuid="${voiceId}">`);
      xml.push(`<prosody pitch="${pitch}" volume="${volume}" rate="${rate}">`);
      xml.push(textToSpeak);
      xml.push(`</prosody>`);
      xml.push(`</voice>`);
      xml.push(`</speak>`);

      const text = xml.join('');
      const hash = crypto.createHash('md5').update(text).digest('hex');
      response.xml = text;
      response.hash = hash;
      response.name = req.body.params.name;
      response.presetId = req.body.id;
      response.myID = req.body.myID;
      response.success = true;
      const existing = await Database.findOne('clips', { hash: hash });
      if (existing) {
        response.clipId = existing.clipId;
        this.io.emit('clip', {
          success: true,
          clipId: existing.clipId,
          presetId: req.body.id,
          myID: req.body.myID,
          clipFileName: existing.filename,
        });
      } else {
        response.lifespan = 20 * 60;
        response.locked = false;
        response.clipId = clipId;
        response.clipInfo = await this.Resemble.createClip(clipId, voiceId, text);
        this.clipQueue.push(response);
      }
      res.status(200).send(response);
    });

    this.app.post('/listen', async (req, res) => {
      res.status(200).send({
        success: true,
      });
    });
  }

  async run() {
    await this.httpServer.listen(process.env.HTTP_PORT);
  }
}

exports.Server = Server;
