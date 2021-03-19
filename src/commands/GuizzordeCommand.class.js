import {
    client,
    configObj,
} from '../config/index.js';
import { reportError } from '../util/index.js';

/** Represents a Guizzorde Slash Command */
export class GuizzordeCommand {
    /** @param {GuizzordeCommand} params */
    constructor(params) {
        /** @type {_slashCommand} command - Command data for registering */
        this.command = params.command;
        /** @type {register} register - Function to register the command */
        this.register = params.register;
        /** @type {deregister} deregister - Function to deregister the command */
        this.deregister = params.deregister;
        /** @type {function} handler - The command function */
        this.handler = params.handler;
    }
}

/** A Command data for registering */
export class _slashCommand {
    /** @param {_slashCommand} params */
    constructor(params) {
        /** @type {string} name */
        this.name = params.name;
        /** @type {string} description */
        this.description = params.description;
        /** @type {array} option */
        this.options = params.options;
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