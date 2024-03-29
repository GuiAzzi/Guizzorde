import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { existsSync, readFileSync } from 'fs';

/** The bot's configuration */
export class Config {
  /** @param {Config} params */
  constructor(params) {
    /** @type {string} appId - Application Id */
    this.appId = params.appId;
    /** @type {string} token - Bot token */
    this.token = params.token;
    /** @type {string} prefix - Message prefix */
    this.prefix = params.prefix;
    /** @type {string} ownerId - OwnerID */
    this.ownerId = params.ownerId;
    /** @type {string} mongodbURI - MongoDb URI */
    this.mongodbURI = params.mongodbURI;
    /** @type {string} mongodbName - MongoDb Name */
    this.mongodbName = params.mongodbName;
    /** @type {[]} mongodbCollections - MongoDb SNM Collection */
    this.mongodbCollections = params.mongodbCollections;
    /** @type {string} OSCredentials - Open Subtitle Credentials */
    this.OSCredentials = params.OSCredentials;
    /** @type {string} RemindMeCollection - Reminders Collection */
    this.RemindMeCollection = params.RemindMeCollection;
    /** @type {string} Auth token for Notion integration */
    this.notionToken = params.notionToken;
    /** @type {string} The database for Notion to interact with */
    this.notionDatabaseId = params.notionDatabaseId;
    /** @type {string} OpenAI API Key */
    this.openAIApiKey = params.openAIApiKey;
    /** @type {string} TMDB API Key */
    this.tmdbApiKey = params.tmdbApiKey;
  }
}

/** @type {Config} */
const configJSON = existsSync('./src/config/config.json')
  ? JSON.parse(readFileSync('./src/config/config.json'))
  : {
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
    notionDatabaseId: process.env.NOTION_DATABASE_ID,
    openAIApiKey: process.env.OPENAI_API_KEY,
    tmdbApiKey: process.env.TMDB_API_KEY,
  };
export const configObj = new Config(configJSON);
export const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.User,
    Partials.Channel,
    Partials.GuildMember,
    Partials.GuildScheduledEvent,
    Partials.Message,
    Partials.Reaction,
  ],
});
