import Discord from 'discord.js';

import {
    getSNMWeek,
    upsertSNMWeek,
} from '../../api/index.js';
import configObj, { client } from '../../config/Config.class.js';
import {
    _slashCommand,
    reportError,
} from '../../util/index.js';
import SNMWeek from './SNMWeek.class.js';

/**
 * 
 * @param {SNMWeek} snmWeek 
 * @returns {Discord.MessageEmbed} An SNM week embed
 */
function snmEmbed(snmWeek) {
    // If snm is finished
    if (snmWeek.status === 'finished') {
        let printArray = [];
        let tempMovies = [];

        // runs through week and get movies, winner and ratings
        let description = `Status: **${snmWeek.paused ? 'paused' : snmWeek.status}**\n`;
        for (let userIndex in snmWeek.users) {
            // If user only voted - no entries or ratings = skip user on summary
            if (!snmWeek.users[userIndex].movies.length > 0 && !snmWeek.users[userIndex].rating) continue;
            printArray[userIndex] = `${snmWeek.users[userIndex].username} - \n`;
            // checks if user has movies and add it to printArray in the position of title key (to print in order in the end)
            if (snmWeek.users[userIndex].movies) {
                for (let movieIndex in snmWeek.users[userIndex].movies) {
                    // if movie is the winner, add to description text
                    if (snmWeek.users[userIndex].movies[movieIndex].titleKey === snmWeek.winner.titleKey)
                        description += `Winner: **${snmWeek.users[userIndex].movies[movieIndex].title}**${snmWeek.winner.voteCount ? ` | ${snmWeek.winner.voteCount} votes` : ""}\n\n`;
                    tempMovies.push(`\`${snmWeek.users[userIndex].movies[movieIndex].title}\``);
                }
            }
            printArray[userIndex] += `${tempMovies.length > 0 ? `Entries: ${tempMovies.join(" | ")}\n` : ""}${snmWeek.users[userIndex].rating ? `Rating: ${snmWeek.users[userIndex].rating}\n\n` : "\n"}`;
            tempMovies = [];
        }

        return new Discord.MessageEmbed()
            // Set the title of the field
            .setTitle(`📖 Summary of Sunday Night Movie ${snmWeek.week} 📖`)
            // Set the color of the embed
            .setColor(0x3498DB)
            // Set the main content of the embed
            .setDescription(description + printArray.join(""));
    }
    // If snm not finished
    else {
        let description = `Status: **${snmWeek.paused ? 'paused' : snmWeek.status}**\n\n`;
        let footer = "";
        let printArray = [];

        // If status is finished, prints winner;
        // if (snmWeek.status === "finished" && snmWeek.winner.titleKey)
        //     description += `Winner: **${snmWeek.users.find(user => user.movies.find(movie => movie.titleKey === snmWeek.winner.titleKey)).movies.find(movie => movie.titleKey === snmWeek.winner.titleKey).title}**\n\n`;

        // Builds list ordered by titleKey
        for (let userIndex in snmWeek.users) {
            for (let movieIndex in snmWeek.users[userIndex].movies)
                printArray[snmWeek.users[userIndex].movies[movieIndex].titleKey - 1] = [`${snmWeek.users[userIndex].movies[movieIndex].titleKey}) ${snmWeek.users[userIndex].movies[movieIndex].title}\n`]
        }

        if (printArray.length === 0)
            printArray.push(`No movies requested yet 😢\n`);

        if (snmWeek.status === "ongoing")
            footer = `!snmAdd <movie name> to add`;
        else if (snmWeek.status === "finished")
            footer = `!snmRate <text> to leave a rating`;
        else if (snmWeek.status === "voting")
            footer = `Votings are open! Go vote 🔥`;

        return new Discord.MessageEmbed()
            // Set the title of the field
            .setTitle(`🌟 Sunday Night Movie ${snmWeek.week} 🌟`)
            // Set the color of the embed
            .setColor(0x3498DB)
            // Set the main content of the embed
            .setDescription(description + printArray.join(""))
            // Set the footer text
            .setFooter(footer);
    }
}

/**
 * 
 * @param {string} guildId - The guild (Server) ID
 * @param {_slashCommand} command - The command settings
 */
async function register(guildId, command) {
    client.api.applications(configObj.appId).guilds(guildId).commands.post({
        data:
        {
            name: command.name,
            description: command.description,
            options: command.options
        }
    });
}

class SNMCommands {
    /**
     * @param {object} snm - /snm [week] [export]
     * @param {object} snmAdmin - /snmAdmin <New|Start|End|Pause>
     */
    constructor() {
        this.snm = {
            command: new _slashCommand(
                'snm',
                `Show this week movies or specified week summary`,
                [
                    {
                        type: 4,
                        name: 'week',
                        description: 'A SNM week number',
                    },
                    {
                        type: 5,
                        name: 'export',
                        description: 'Prints the raw SNM data',
                    }
                ]
            ),
            /**
             * 
             * @param {string} guildId - The guild (Server) ID
             */
            register: (guildId) => register(guildId, this.snm.command),
            /**
             * 
             * @param {*} interaction - Interaction object
             */
            handler: async function (interaction) {
                const week = interaction.data.options?.find((arg => arg.name === 'week'))?.value;
                const _export = interaction.data.options?.find((arg => arg.name === 'export'))?.value;

                let snmWeekEmbed = new Discord.MessageEmbed().setTitle('Searching...').setColor(0x3498DB);

                // Sends to-be-edited message
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            embeds: [snmWeekEmbed]
                        }
                    }
                });

                try {
                    const snmWeek = await getSNMWeek(interaction.guild_id, week);

                    // Week doesn't exist
                    if (!snmWeek.week) {
                        await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                            data: {
                                embeds: [snmWeekEmbed.setTitle('Error').setDescription('No week found').setColor('RED')]
                            }
                        });
                    }
                    else {
                        snmWeekEmbed.setTitle(`👨‍💻 Sunday Night Movie ${snmWeek.week} Data 👨‍💻`).setDescription(`\`\`\`JSON\n${JSON.stringify(snmWeek, null, 2)}\`\`\``);
                        await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                            data: {
                                embeds: [_export ? snmWeekEmbed : snmEmbed(snmWeek)]
                            }
                        });
                    }
                }
                catch (e) {
                    reportError(e);
                    await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            embeds: [snmWeekEmbed.setTitle('Error').setDescription('An error has occured. Pelase report this bug.').setColor("RED")]
                        }
                    });
                }
            }
        }
        this.snmAdmin = {
            command: new _slashCommand(
                'snmAdmin',
                `Manage current SNM`,
                [
                    {
                        type: 3,
                        name: 'command',
                        required: true,
                        description: 'The admin command',
                        choices: [
                            {
                                name: 'Create a new SNM',
                                value: 'new'
                            },
                            {
                                name: 'Start current SNM voting',
                                value: 'start'
                            },
                            {
                                name: 'End current SNM voting',
                                value: 'end'
                            },
                            {
                                name: 'Toggle automatic SNM functions',
                                value: 'pause'
                            }
                        ]
                    }
                ]
            ),
            /**
             * 
             * @param {string} guildId - The guild (Server) ID
             */
            register: (guildId) => register(guildId, this.snmAdmin.command),
            /**
             * 
             * @param {*} interaction - Interaction object
             */
            handler: async function (interaction) {
                const command = interaction.data.options?.find((arg => arg.name === 'command'))?.value;

                // Fetch guild and member (to ADMINISTRATOR check permission)
                const guildPerformed = await client.guilds.fetch(interaction.guild_id);
                const memberPerformed = await guildPerformed.members.fetch(interaction.member.user.id);

                switch (command) {
                    case 'new': {
                        try {
                            // Can only be used by admins and bot self
                            if (!memberPerformed.hasPermission('ADMINISTRATOR') || !interaction.member.user.id === client.user.id) {
                                await client.api.interactions(interaction.id, interaction.token).callback.post({
                                    data: {
                                        type: 3,
                                        data: {
                                            content: `You can't do that. Ask my lovely master. 🌵`,
                                            flags: 64
                                        }
                                    }
                                });
                                break;
                            }

                            // Interaction first contact (to be edited)
                            let newSNMEmbed = new Discord.MessageEmbed().setTitle('Creating SNM').setDescription('🛠 Working...').setColor(0x3498DB)
                            await client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 5,
                                    data: {
                                        embeds: [newSNMEmbed],
                                    }
                                }
                            });

                            const lastSNM = await getSNMWeek(interaction.guild_id);

                            if (lastSNM && lastSNM.status != 'finished') {
                                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                    data: {
                                        embeds: [
                                            newSNMEmbed
                                                .setTitle(`Can't start new SNM`)
                                                .setDescription(`Sunday Night Movie ${lastSNM.week} is \`${lastSNM.status}\``)
                                        ]
                                    }
                                })
                                break;
                            }

                            let newSNM = new SNMWeek(
                                {
                                    guildId: interaction.guild_id,
                                    week: lastSNM?.week + 1 || 1,
                                    status: 'ongoing',
                                    movieCount: 0,
                                    paused: lastSNM?.paused ? true : false
                                }
                            )

                            newSNM = await upsertSNMWeek(newSNM);
                            let snmRole;
                            if (interaction?.guild_id)
                                snmRole = guildPerformed.roles.cache.find(role => role.name.toUpperCase() === "SNM" || role.name.toUpperCase() === "SNM™");
                            await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                data: {
                                    embeds: [
                                        newSNMEmbed
                                            .setTitle(`🎬 Sunday Night Movie ${newSNM.week} 🎬`)
                                            .setDescription(`Requests are now open!\n\`/snmTitle add title: <movie name>\` to request a movie.`)
                                    ]
                                }
                            })
                            break;
                        }
                        catch (e) {
                            reportError(e);
                            await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                data: {
                                    embeds: [new Discord.MessageEmbed().setTitle('Error').setDescription('An error has occured. Pelase report this bug.').setColor("RED")]
                                }
                            });
                        }
                    }
                    case 'start': {
                        try {
                            // Can only be used by admins and bot self
                            if (!memberPerformed.hasPermission('ADMINISTRATOR') || !interaction.member.user.id === client.user.id) {
                                await client.api.interactions(interaction.id, interaction.token).callback.post({
                                    data: {
                                        type: 3,
                                        data: {
                                            content: `You can't do that. Ask my lovely master. 🌵`,
                                            flags: 64
                                        }
                                    }
                                });
                                break;
                            }

                            // Interaction first contact (to be edited)
                            let startSNMEmbed = new Discord.MessageEmbed().setTitle('Starting SNM').setDescription('🛠 Working...').setColor(0x3498DB)
                            await client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 5,
                                    data: {
                                        embeds: [startSNMEmbed],
                                    }
                                }
                            });

                            let lastSNM;
                            lastSNM = await getSNMWeek(interaction.guild_id);
                        }
                        catch (e) {
                            reportError(e);
                        }
                    }
                }
            }
        }
    }
}

export const SNMObj = new SNMCommands();

export function snm_register(appId, guildId) {
    // snmTitle add <title>
    // snmTitle remove [title]
    client.api.applications(appId).guilds(guildId).commands.post({
        data:
        {
            name: 'snmTitle',
            description: `Add or remove SNM entries`,
            options: [
                {
                    type: 1,
                    name: 'add',
                    description: 'Add a movie to current SNM',
                    options: [
                        {
                            type: 3,
                            name: 'title',
                            required: true,
                            description: 'The movie title'
                        }
                    ]
                },
                {
                    type: 1,
                    name: 'remove',
                    description: 'Remove a movie from current SNM',
                    options: [
                        {
                            type: 3,
                            name: 'title',
                            description: 'The movie title or SNM number'
                        }
                    ]
                }
            ]
        }
    });

    // snmRate <text>
    client.api.applications(appId).guilds(guildId).commands.post({
        data:
        {
            name: 'snmRate',
            description: `Add or change your current SNM rating`,
            options: [
                {
                    type: 3,
                    name: 'rating',
                    description: 'Your rating',
                    required: true
                }
            ]
        }
    });

    // snmVotes <Show | Clear>
    client.api.applications(appId).guilds(guildId).commands.post({
        data:
        {
            name: 'snmVotes',
            description: `Manage your current SNM votes`,
            options: [
                {
                    type: 3,
                    name: 'command',
                    description: 'Show or clear your votes',
                    required: true,
                    choices: [
                        {
                            name: 'Show',
                            value: 'show'
                        },
                        {
                            name: 'Clear',
                            value: 'clear'
                        }
                    ]
                }
            ]
        }
    });
}