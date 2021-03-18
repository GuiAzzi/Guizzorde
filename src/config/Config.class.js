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
   * @param {array} mongodbCollections - MongoDb SNM Collection
   * @param {string} OSCredentials - Open Subtitle Credentials
   */
  constructor() {
    this.appId = process.env.APP_ID || configJSON.appId;
    this.token = process.env.TOKEN || configJSON.token;
    this.prefix = process.env.PREFIX || configJSON.prefix;
    this.ownerId = process.env.OWNER_ID || configJSON.ownerId;
    this.mongodbURI = process.env.MONGODB_URI || configJSON.mongodbURI;
    this.mongodbName = process.env.MONGODB_NAME || configJSON.mongodbName;
    this.mongodbCollections = process.env.MONGODB_COLLECTIONS.split(',') || configJSON.mongodbCollections;
    this.OSCredentials = process.env.OSCREDENTIALS?.split(',') || configJSON.OSCredentials;
  }
}

/**
 * Register a command
 * @param {_slashCommand} command - The command settings
 * @param {string} [guildId] - The guild (Server) ID
 */
export async function register(command, guildId) {
  try {
    // If guild-specific
    if (guildId) {
      await client.api.applications(configObj.appId).guilds(guildId).commands.post({
        data:
        {
          name: command.name,
          description: command.description,
          options: command.options
        }
      });
    }
    else {
      await client.api.applications(configObj.appId).commands.post({
        data:
        {
          name: command.name,
          description: command.description,
          options: command.options
        }
      });
    }
  }
  catch (e) {
    reportError(e);
  }
}
/**
 * Deregister a command
 * @param {_slashCommand} command - The command settings
 * @param {string} [guildId] - The guild (Server) ID
 */
export async function deregister(command, guildId) {
  try {
    // if guild-specific
    if (guildId) {
      const guildCommands = await client.api.applications(configObj.appId).guilds(guildId).commands.get();
      const specifiedCommand = guildCommands.find(gCommand => gCommand.name.toLowerCase() === command.name.toLowerCase());
      if (specifiedCommand)
        await client.api.applications(configObj.appId).guilds(guildId).commands(specifiedCommand.id).delete();
    }
    else {
      const globalCommands = await client.api.applications(configObj.appId).commands.get();
      const specifiedCommand = globalCommands.find(gCommand => gCommand.name.toLowerCase() === command.name.toLowerCase());
      if (specifiedCommand)
        await client.api.applications(configObj.appId).commands(specifiedCommand.id).delete();
    }
  }
  catch (e) {
    reportError(e);
  }
}

export const configObj = new Config();
export const client = new Discord.Client({ partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION'] });