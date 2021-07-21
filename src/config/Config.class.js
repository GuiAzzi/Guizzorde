import Discord from 'discord.js';
import {
    existsSync,
    readFileSync,
} from 'fs';

/** The bot's configuration */
export class Config {
    /** @param {Config} params */
    constructor(params) {
        /** @type {string} appId - Application Id */
        this.appId = params.appId
        /** @type {string} token - Bot token */
        this.token = params.token
        /** @type {string} prefix - Message prefix */
        this.prefix = params.prefix;
        /** @type {string} ownerId - OwnerID */
        this.ownerId = params.ownerId;
        /** @type {string} mongodbURI - MongoDb URI */
        this.mongodbURI = params.mongodbURI;
        /** @type {string} mongodbName - MongoDb Name */
        this.mongodbName = params.mongodbName;
        /** @type {array} mongodbCollections - MongoDb SNM Collection */
        this.mongodbCollections = params.mongodbCollections;
        /** @type {string} OSCredentials - Open Subtitle Credentials */
        this.OSCredentials = params.OSCredentials;
        /** @type {string} RemindMeCollection - Reminders Collection */
        this.RemindMeCollection = params.RemindMeCollection;
        /** @type {notionToken} Auth token for Notion integration */
        this.notionToken = params.notionToken;
        /** @type {notionDatabaseId} The database for Notion to interact with */
        this.notionDatabaseId = params.notionDatabaseId;
    }
}

/** @type {Config} */
const configJSON = existsSync('./src/config/config.json') ? JSON.parse(readFileSync('./src/config/config.json')) : {
    appId: process.env.APP_ID,
    token: process.env.TOKEN,
    prefix: process.env.PREFIX,
    ownerId: process.env.OWNER_ID,
    mongodbURI: process.env.MONGODB_URI,
    mongodbName: process.env.MONGODB_NAME,
    mongodbCollections: process.env.MONGODB_COLLECTIONS?.split(','),
    OSCredentials: process.env.OSCREDENTIALS?.split(','),
    RemindMeCollection: process.env.REMINDME_COLLECTION,
    notionToken: process.env.NOTION_KEY,
    notionDatabaseId: process.env.NOTION_DATABASE_ID

};
export const configObj = new Config(configJSON);
export const client = new Discord.Client({ partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION'] });