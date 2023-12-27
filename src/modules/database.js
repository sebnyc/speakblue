const { MongoClient } = require('mongodb');

class Database {
  constructor() {
    this.handler = {
      connected: false,
      connection: null,
      client: null,
      collections: {
        users: null,
        clips: null,
        presets: null,
        texts: null,
        tags: null,
        // runtime:
        sentence: null,
        settings: null,
        // new ones:
        partition: null,
        pause: null,
        text: null,
      },
    };
  }

  getHandler() {
    return this.handler;
  }

  getDbURI() {
    return process.env.DB_URI;
  }

  getDbName() {
    return process.env.DB_NAME;
  }

  async connect(collection) {
    if (collection) {
      if (this.getHandler().connected === false) {
        this.getHandler().connection = new MongoClient(this.getDbURI(), {
          useUnifiedTopology: true,
        });
        await this.getHandler().connection.connect();
        this.getHandler().client = this.getHandler().connection.db(this.getDbName());
        for (let coll in this.getHandler().collections) {
          this.getHandler().collections[coll] = this.getHandler().client.collection(coll);
        }
        this.getHandler().connected = true;
      }
    } else {
      if (this.handler.connected === false) {
        this.handler.connection = new MongoClient(this.getDbURI(), {
          useUnifiedTopology: true,
        });
        await this.handler.connection.connect();
        this.handler.client = this.handler.connection.db(this.getDbName());
        for (let coll in this.handler.collections) {
          this.handler.collections[coll] = this.handler.client.collection(coll);
        }
        this.handler.connected = true;
      }
    }
  }

  async close(collection) {
    if (collection) {
      if (this.getHandler().connected === true) {
        await this.getHandler().connection.close();
        this.getHandler().connected = false;
      }
    } else {
      if (this.handler.connected === true) {
        await this.handler.connection.close();
        this.handler.connected = false;
      }
    }
  }

  async find(collection, ...args) {
    await this.connect(collection);
    if (!this.getHandler().collections[collection]) {
      throw new Error(`find: unknown collection '${collection}'.`);
    }
    let doc;
    const result = [];
    const cursor = await this.getHandler().collections[collection].find.apply(
      this.getHandler().collections[collection],
      args,
    );
    while ((doc = await cursor.next())) {
      result.push(doc);
    }
    return result;
  }

  async findOne(collection, ...args) {
    await this.connect(collection);
    if (!this.getHandler().collections[collection]) {
      throw new Error(`findOne: unknown collection '${collection}'.`);
    }
    const result = await this.getHandler().collections[collection].findOne.apply(
      this.getHandler().collections[collection],
      args,
    );
    return result;
  }

  async count(collection, ...args) {
    await this.connect(collection);
    if (!this.getHandler().collections[collection]) {
      throw new Error(`count: unknown collection '${collection}'.`);
    }
    const result = await this.getHandler().collections[collection].count.apply(
      this.getHandler().collections[collection],
      args,
    );
    return result;
  }

  async insertOne(collection, ...args) {
    await this.connect(collection);
    if (!this.getHandler().collections[collection]) {
      throw new Error(`insertOne: unknown collection '${collection}'.`);
    }
    const result = await this.getHandler().collections[collection].insertOne.apply(
      this.getHandler().collections[collection],
      args,
    );
    return result;
  }

  async replaceOne(collection, ...args) {
    await this.connect(collection);
    if (!this.getHandler().collections[collection]) {
      throw new Error(`replaceOne: unknown collection '${collection}'.`);
    }
    const result = await this.getHandler().collections[collection].replaceOne.apply(
      this.getHandler().collections[collection],
      args,
    );
    return result;
  }

  async deleteOne(collection, ...args) {
    await this.connect(collection);
    if (!this.getHandler().collections[collection]) {
      throw new Error(`deleteOne: unknown collection '${collection}'.`);
    }
    const result = await this.getHandler().collections[collection].deleteOne.apply(
      this.getHandler().collections[collection],
      args,
    );
    return result;
  }

  async deleteMany(collection, ...args) {
    await this.connect(collection);
    if (!this.getHandler().collections[collection]) {
      throw new Error(`deleteMany: unknown collection '${collection}'.`);
    }
    const result = await this.getHandler().collections[collection].deleteMany.apply(
      this.getHandler().collections[collection],
      args,
    );
    return result;
  }

  async dropIndexes(collection, ...args) {
    await this.connect(collection);
    if (!this.getHandler().collections[collection]) {
      throw new Error(`dropIndexes: unknown collection '${collection}'.`);
    }
    const result = await this.getHandler().collections[collection].dropIndexes.apply(
      this.getHandler().collections[collection],
      args,
    );
    return result;
  }

  async createIndex(collection, ...args) {
    await this.connect(collection);
    if (!this.getHandler().collections[collection]) {
      throw new Error(`createIndex: unknown collection '${collection}'.`);
    }
    const result = await this.getHandler().collections[collection].createIndex.apply(
      this.getHandler().collections[collection],
      args,
    );
    return result;
  }
}

exports.Database = new Database();
exports.ObjectId = require('mongodb').ObjectId;
