import Discord from 'discord.js';
import {
  existsSync,
  readFileSync,
} from 'fs';

const configJSON = existsSync('./src/config/config.json') ? JSON.parse(readFileSync('./src/config/config.json')) : null;

export class Config {
  /**
   * @param {string} appId - Application Id
   * @param {string} token - Bot token
   * @param {string} prefix - Message prefix
   * @param {string} ownerId - OwnerID
   * @param {string} mongodbURI - MongoDb URI
   * @param {string} mongodbName - MongoDb Name
   * @param {string} mongodbCollection - MongoDb SNM Collection
   * @param {string} OSCredentials - Open Subtitle Credentials
   */
  constructor() {
    this.appId = process.env.APP_ID || configJSON.appId;
    this.token = process.env.TOKEN || configJSON.token;
    this.prefix = process.env.PREFIX || configJSON.prefix;
    this.ownerId = process.env.OWNER_ID || configJSON.ownerId;
    this.mongodbURI = process.env.MONGODB_URI || configJSON.mongodbURI;
    this.mongodbName = process.env.MONGODB_NAME || configJSON.mongodbName;
    this.mongodbCollection = process.env.MONGODB_COLLECTION || configJSON.mongodbCollection;
    this.OSCredentials = process.env.OSCREDENTIALS?.split(',') || configJSON.OSCredentials;
  }
}

export default new Config();
export const client = new Discord.Client({ partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION'] }); 