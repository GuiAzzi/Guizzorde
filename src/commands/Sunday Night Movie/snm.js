import { CronTime } from 'cron';
import Discord from 'discord.js';

import {
    getSNMServer,
    getSNMWeek,
    upsertSNMServer,
    upsertSNMWeek,
} from '../../api/index.js';
import {
    client,
    configObj,
} from '../../config/index.js';
import {
    randomEmoji,
    reportError,
} from '../../util/index.js';
import {
    _slashCommand,
    deregister,
    GuizzordeCommand,
    register,
} from '../index.js';
import { generateMovieEmbed } from '../movie/index.js';
import {
    SNMSchedulesArray,
    SNMServer,
    SNMWeek,
} from './index.js';

export const snmCommands = {
    /** @type {GuizzordeCommand} /snm [week] [export] */
    snm: new GuizzordeCommand({
        command: new _slashCommand({
            name: 'snm',
            description: `Show this week movies or specified week summary`,
            options: [
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

        }),
        register: register,
        deregister: deregister,
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
    }),
    /** @type {GuizzordeCommand} snmAdmin - /snmAdmin <New|Start|End|Pause> */
    snmAdmin: new GuizzordeCommand({
        command: new _slashCommand({
            name: 'snmAdmin',
            description: `Manage current SNM`,
            options: [
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
                        }
                    ]
                }
            ]
        }),
        register: register,
        deregister: deregister,
        handler: async function (interaction) {
            const command = interaction.data.options?.find((arg => arg.name === 'command'))?.value;

            // Fetch guild and member (to ADMINISTRATOR check permission)
            const guildPerformed = await client.guilds.fetch(interaction.guild_id);
            const memberPerformed = await guildPerformed.members.fetch(interaction.member.user.id);

            // if fromSchedules: true = command executed from scheduler
            // scheduleMsg holds Discord.Message obj
            let scheduleMsg;

            switch (command) {
                case 'new': {
                    try {
                        // Can only be used by admins and bot self
                        if (!memberPerformed.hasPermission('ADMINISTRATOR') && interaction.member.user.id !== client.user.id) {
                            if (!interaction.fromScheduler) {
                                await client.api.interactions(interaction.id, interaction.token).callback.post({
                                    data: {
                                        type: 3,
                                        data: {
                                            content: `Insufficient permissions.`,
                                            flags: 64
                                        }
                                    }
                                });
                            }
                            break;
                        }

                        // Interaction first contact (to be edited)
                        let newSNMEmbed = new Discord.MessageEmbed().setTitle('Creating SNM').setDescription('🛠 Working...').setColor(0x3498DB);
                        if (!interaction.fromScheduler) {
                            await client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 5,
                                    data: {
                                        embeds: [newSNMEmbed],
                                    }
                                }
                            });
                        }
                        else {
                            // If bot can't get channel - it may have been deleted
                            if (!await client.channels.cache.get(interaction.channel_id))
                                return reportError(`Couldn't get defaultChannel of ${interaction.guild_id}. Maybe it was deleted?`);

                            scheduleMsg = await client.channels.cache.get(interaction.channel_id).send(newSNMEmbed);
                        }

                        const lastSNM = await getSNMWeek(interaction.guild_id);

                        if (lastSNM.week && lastSNM.status != 'finished') {

                            newSNMEmbed.setTitle(`Can't start new SNM`).setDescription(`Sunday Night Movie ${lastSNM.week} is \`${lastSNM.status}\``)

                            if (!interaction.fromScheduler) {
                                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                    data: {
                                        embeds: [newSNMEmbed]
                                    }
                                })
                            }
                            else
                                await scheduleMsg.edit(newSNMEmbed);
                            break;
                        }

                        let newSNM = new SNMWeek(
                            {
                                guildId: interaction.guild_id,
                                week: lastSNM?.week + 1 || 1,
                                status: 'ongoing',
                                movieCount: 0,
                                paused: lastSNM?.paused ? true : false,
                                users: [],
                                winner: ''
                            }
                        )

                        newSNM = await upsertSNMWeek(newSNM);
                        const SNMRole = await getSNMRole(interaction.guild_id);
                        newSNMEmbed
                            .setTitle(`🎬 Sunday Night Movie ${newSNM.week} 🎬`)
                            .setDescription(`Requests are now open!\n\`/snmTitle add title: <movie name>\` to request a movie.`);
                        if (!interaction.fromScheduler) {
                            await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                data: {
                                    embeds: [newSNMEmbed]
                                }
                            })
                        }
                        else
                            scheduleMsg.edit(newSNMEmbed);
                        break;
                    }
                    catch (e) {
                        reportError(e);
                        if (!interaction.fromScheduler) {
                            await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                data: {
                                    embeds: [new Discord.MessageEmbed().setTitle('Error').setDescription('An error has occured. Pelase report this bug.').setColor("RED")]
                                }
                            });
                        }
                    }
                }
                case 'start': {
                    try {
                        // Can only be used in guilds
                        if (!interaction.guild_id) {
                            if (!interaction.fromScheduler) {
                                await client.api.interactions(interaction.id, interaction.token).callback.post({
                                    data: {
                                        type: 3,
                                        data: {
                                            content: `Can't use this command in DMs`,
                                            flags: 64
                                        }
                                    }
                                });
                            }
                            break;
                        }
                        // Can only be used by admins and bot self
                        else if (!memberPerformed.hasPermission('ADMINISTRATOR') && interaction.member.user.id !== client.user.id) {
                            if (!interaction.fromScheduler) {
                                await client.api.interactions(interaction.id, interaction.token).callback.post({
                                    data: {
                                        type: 3,
                                        data: {
                                            content: `Insufficient permissions.`,
                                            flags: 64
                                        }
                                    }
                                });
                            }
                            break;
                        }

                        // Interaction first contact (to be edited)
                        let startSNMEmbed = new Discord.MessageEmbed().setTitle('Starting SNM').setDescription('🛠 Working...').setColor(0x3498DB);
                        if (!interaction.fromScheduler) {
                            await client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 5,
                                    data: {
                                        embeds: [startSNMEmbed],
                                    }
                                }
                            });
                        }
                        else {
                            // If bot can't get channel - it may have been deleted
                            if (!await client.channels.cache.get(interaction.channel_id))
                                return reportError(`Couldn't get defaultChannel of ${interaction.guild_id}. Maybe it was deleted?`);

                            scheduleMsg = await client.channels.cache.get(interaction.channel_id).send(startSNMEmbed);
                        }

                        // get message to add reactions and save on snmWeek object
                        let voteMessage;
                        if (!interaction.fromScheduler) {
                            const webhookMessage = await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({ data: {} });
                            voteMessage = new Discord.Message(client, webhookMessage, client.channels.cache.get(webhookMessage.channel_id));
                        }
                        else
                            voteMessage = scheduleMsg

                        const lastSNM = await getSNMWeek(interaction.guild_id);

                        if (!lastSNM.week) {
                            startSNMEmbed.setTitle('Error').setDescription('No week to start').setColor("RED");
                            if (!interaction.fromScheduler) {
                                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                    data: {
                                        embeds: [startSNMEmbed]
                                    }
                                });
                            }
                            else
                                await scheduleMsg.edit(startSNMEmbed);
                            break;
                        }
                        else if (lastSNM.status === 'voting') {
                            startSNMEmbed.setTitle('Error').setDescription(`\`SNM ${lastSNM.week}\` voting has already started!`).setColor("RED");
                            if (!interaction.fromScheduler) {
                                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                    data: {
                                        embeds: [startSNMEmbed]
                                    }
                                });
                            }
                            else
                                await scheduleMsg.edit(startSNMEmbed);
                            break;
                        }
                        else if (lastSNM.status === 'finished') {
                            startSNMEmbed.setTitle('Error').setDescription(`\`SNM ${lastSNM.week}\` is finished.`).setColor("RED");
                            if (!interaction.fromScheduler) {
                                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                    data: {
                                        embeds: [startSNMEmbed]
                                    }
                                });
                            }
                            else
                                await scheduleMsg.edit(startSNMEmbed);
                            break;
                        }

                        lastSNM.status = 'voting';
                        lastSNM.voteMessage = { channelId: voteMessage.channel.id, messageId: voteMessage.id };
                        // Builds rich embed with a random emoji for each movie
                        const printArray = [];
                        const emojiArray = client.guilds.cache.get(interaction.guild_id).emojis.cache;
                        const emojisUsed = [];

                        lastSNM.users.forEach(user => {
                            user.movies.forEach(movie => {
                                let rndEmoji;
                                if (emojiArray.size !== 0) {
                                    rndEmoji = emojiArray.random();
                                    printArray[movie.titleKey - 1] = `<:${rndEmoji.name}:${rndEmoji.id}> - ${movie.title}\n`;
                                    emojisUsed[movie.titleKey - 1] = { titleKey: movie.titleKey, emoji: rndEmoji.identifier };
                                    emojiArray.delete(rndEmoji.id);
                                }
                                // It will break if there are more movies than custom emojis
                                else {
                                    rndEmoji = randomEmoji();
                                    while (emojisUsed.includes(rndEmoji))
                                        rndEmoji = randomEmoji();
                                    printArray[movie.titleKey - 1] = `${rndEmoji} - ${movie.title}\n`;
                                    emojisUsed[movie.titleKey - 1] = { titleKey: movie.titleKey, emoji: rndEmoji };
                                }
                            })
                        });
                        lastSNM.emojisUsed = emojisUsed;
                        await upsertSNMWeek(lastSNM);

                        const SNMRole = await getSNMRole(interaction.guild_id);

                        // Create the embed with titles, emojis and reactions
                        let votingEmbed = new Discord.MessageEmbed()
                            .setTitle(`🌟 Sunday Night Movie ${lastSNM.week} 🌟`)
                            .setColor(0x3498DB)
                            .setDescription(printArray.join(" "))
                            .setFooter('Click the corresponding reaction to vote!');

                        for (const emoji of emojisUsed)
                            await voteMessage.react(emoji.emoji);

                        const mentionMsg = `${SNMRole ? "<@&" + SNMRole.id + "> " : "@here"} Voting has started!`
                        if (!interaction.fromScheduler) {
                            await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                data: {
                                    embeds: [votingEmbed]
                                }
                            });
                            new Discord.WebhookClient(configObj.appId, interaction.token).send(mentionMsg);
                        }
                        else {
                            await scheduleMsg.edit(votingEmbed);
                            await client.channels.cache.get(interaction.channel_id).send(mentionMsg);
                        }
                        break;
                    }
                    catch (e) {
                        reportError(e);
                    }
                }
                case 'end': {
                    try {
                        // Can only be used in guilds
                        if (!interaction.guild_id) {
                            if (!interaction.fromScheduler) {
                                await client.api.interactions(interaction.id, interaction.token).callback.post({
                                    data: {
                                        type: 3,
                                        data: {
                                            content: `Can't use this command in DMs`,
                                            flags: 64
                                        }
                                    }
                                });
                            }
                            break;
                        }
                        // Can only be used by admins and bot self
                        else if (!memberPerformed.hasPermission('ADMINISTRATOR') && interaction.member.user.id !== client.user.id) {
                            if (!interaction.fromScheduler) {
                                await client.api.interactions(interaction.id, interaction.token).callback.post({
                                    data: {
                                        type: 3,
                                        data: {
                                            content: `Insufficient permissions.`,
                                            flags: 64
                                        }
                                    }
                                });
                            }
                            break;
                        }

                        // Interaction first contact (to be edited)
                        let endSNMEmbed = new Discord.MessageEmbed().setTitle('Ending SNM').setDescription('🛠 Working...').setColor(0x3498DB);
                        if (!interaction.fromScheduler) {
                            await client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 5,
                                    data: {
                                        embeds: [endSNMEmbed],
                                    }
                                }
                            });
                        }
                        else {
                            // If bot can't get channel - it may have been deleted
                            if (!await client.channels.cache.get(interaction.channel_id))
                                return reportError(`Couldn't get defaultChannel of ${interaction.guild_id}. Maybe it was deleted?`);

                            scheduleMsg = await client.channels.cache.get(interaction.channel_id).send(endSNMEmbed);
                        }

                        let winnerMovie;
                        let embedDescription;

                        const lastSNM = await getSNMWeek(interaction.guild_id);

                        if (!lastSNM.week) {
                            endSNMEmbed.setTitle('Error').setDescription('No week to end').setColor("RED");
                            if (!interaction.fromScheduler) {
                                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                    data: {
                                        embeds: [endSNMEmbed]
                                    }
                                });
                            }
                            else
                                await scheduleMsg.edit(endSNMEmbed);
                            break;
                        }

                        // TODO: If a movie was passed - select it as winner
                        // <logic>

                        // creates array with titleKey and voteCount (movie:votes)
                        let allVotes = [];

                        for (const userIndex in lastSNM.users) {
                            for (const movieIndex in lastSNM.users[userIndex].movies) {
                                const titleKey = lastSNM.users[userIndex].movies[movieIndex].titleKey
                                !allVotes[titleKey - 1] ? allVotes[titleKey - 1] = { titleKey: titleKey, voteCount: 0 } : allVotes[titleKey - 1].titleKey = titleKey;
                            }
                            for (const voteIndex in lastSNM.users[userIndex].votes) {
                                const voteTitleKey = lastSNM.users[userIndex].votes[voteIndex];
                                !allVotes[voteTitleKey - 1] ? allVotes[voteTitleKey - 1] = { titleKey: null, voteCount: 1 } : allVotes[voteTitleKey - 1].voteCount++
                            }
                        }

                        // get what voteCount is the highest
                        const maxVotes = allVotes.reduce((prev, current) => {
                            return (prev.voteCount > current.voteCount) ? prev : current;
                        });
                        // get movies that had more votes (=== maxVotes)
                        const winners = allVotes.filter((obj) => {
                            return obj.voteCount === maxVotes.voteCount
                        });
                        // if more than 1 winner => tied
                        if (winners.length > 1) {
                            const tiedWinnersTitle = [];
                            for (const winner in winners) {
                                tiedWinnersTitle.push(`\`${lastSNM.users.find(user => user.movies.find(movie => movie.titleKey === winners[winner].titleKey)).movies.find(movie => movie.titleKey === winners[winner].titleKey).title}\``);
                            }

                            embedDescription = `\n${tiedWinnersTitle.join(" | ")} got ${maxVotes.voteCount} votes each!\nRandomly picking a movie...\n\n`;
                            endSNMEmbed
                                .setTitle(`😲 It's a tie! 😲`)
                                .setDescription(embedDescription + `Checking...`);
                            if (!interaction.fromScheduler) {
                                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                    data: {
                                        embeds: [endSNMEmbed]
                                    }
                                });
                            }
                            else
                                await scheduleMsg.edit(endSNMEmbed);
                            const rndWinnerPos = Math.floor(Math.random() * winners.length);
                            lastSNM.winner = winners[rndWinnerPos];
                            winnerMovie = { title: tiedWinnersTitle[rndWinnerPos].substr(1, tiedWinnersTitle[rndWinnerPos].length - 2) };
                        }
                        else {
                            embedDescription = `With ${maxVotes.voteCount} votes:\n\n`
                            endSNMEmbed
                                .setTitle(`🙌 We have a winner! 🙌`)
                                .setDescription(embedDescription + `Checking...`);
                            if (!interaction.fromScheduler) {
                                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                    data: {
                                        embeds: [endSNMEmbed]
                                    }
                                });
                            }
                            else
                                await scheduleMsg.edit(endSNMEmbed);
                            lastSNM.winner = winners[0];
                            winnerMovie = { title: lastSNM.users.find(user => user.movies.find(movie => movie.titleKey === lastSNM.winner.titleKey)).movies.find(movie => movie.titleKey === lastSNM.winner.titleKey).title };
                        }

                        lastSNM.status = 'finished';
                        await upsertSNMWeek(lastSNM);
                        endSNMEmbed.setDescription(embedDescription + `🎉 **${winnerMovie.title}** 🎉`);
                        if (!interaction.fromScheduler) {
                            await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                data: {
                                    embeds: [endSNMEmbed]
                                }
                            });
                        }
                        else
                            await scheduleMsg.edit(endSNMEmbed);

                        // TODO: Add SNMServer defaultRegion
                        // /movie followup message
                        const movieEmbed = await client.channels.cache.get(interaction.channel_id).send(new Discord.MessageEmbed().setTitle('Searching...').setColor(0x3498DB));
                        movieEmbed.edit(await generateMovieEmbed(winnerMovie.title, 'pt'));
                    }
                    catch (e) {
                        reportError(e);
                    }
                }
            }
        }
    }),
    /** @type {GuizzordeCommand} snmTitle - /snmTitle add <title> | /snmTitle remove [title] */
    snmTitle: new GuizzordeCommand({
        command: new _slashCommand({
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
                        },
                        {
                            type: 5,
                            name: 'silent',
                            description: 'No message will be sent to the channel.'
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
                            required: true,
                            description: 'The movie title or SNM number'
                        },
                        {
                            type: 5,
                            name: 'silent',
                            description: 'No message will be sent to the channel.'
                        }
                    ]
                }
            ]
        }),
        register: register,
        deregister: deregister,
        handler: async function (interaction) {
            try {
                // Cannot be used in DM
                if (!interaction.guild_id) {
                    return await client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: `Can't use this command a DM channel.`,
                                flags: 64
                            }
                        }
                    });
                }

                const interactionOptions = interaction.data.options?.find((arg => arg.name === 'add' || arg.name === 'remove'));
                const interactionChoice = interactionOptions.name;
                const titleName = interactionOptions.options?.find((arg => arg.name === 'title'))?.value;
                const silent = interactionOptions.options?.find((arg => arg.name === 'silent'))?.value;

                const snmServer = await getSNMServer(interaction.guild_id);
                const lastSNM = await getSNMWeek(interaction.guild_id);

                if (!lastSNM.week) {
                    return await client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 3,
                            data: {
                                content: `No week to interact with`,
                                flags: 64
                            }
                        }
                    });
                }

                switch (interactionChoice) {
                    case 'add': {
                        // Interaction first contact (to be edited)
                        // if silent - use ephemeral messages
                        if (silent) {
                            await client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 3,
                                    data: {
                                        content: `Adding title...`,
                                        flags: 64
                                    }
                                }
                            })
                        }
                        else if (!silent) {
                            await client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 5,
                                    data: {
                                        content: `Adding title...`,
                                    }
                                }
                            });
                        }

                        // If week is no longer "ongoing"
                        if (lastSNM.status != 'ongoing') {
                            return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                data: {
                                    content: `Can't modify \`Sunday Night Movie ${lastSNM.week}\` as it is \`${lastSNM.status}\``
                                }
                            });
                        }

                        const authorId = interaction.member.user.id;
                        // Checks if user is already on the list
                        let userObject = lastSNM.users.find((user) => user.userId === authorId);

                        if (userObject) {
                            // Check user entries
                            if (userObject.movies.length === snmServer.maxEntries) {
                                return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                    data: {
                                        content: `You have no entries left.\nRemove entries with \`/snmTitle remove\`.`
                                    }
                                });
                            }
                        }
                        // Add user to the list and update userObject
                        else
                            userObject = lastSNM.users[lastSNM.users.push({ userId: authorId, username: interaction.member.user.username, movies: [], votes: [] }) - 1];

                        // If movie is already on the list, cancel and inform user
                        if (lastSNM.users.find((user) => user.movies.find((movie) => movie.title === titleName))) {
                            return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                data: {
                                    content: `This title is already on the list!`
                                }
                            });
                        }

                        // Adds movie to the list
                        lastSNM.movieCount++
                        userObject.movies.push({ title: titleName, titleKey: lastSNM.movieCount });

                        await upsertSNMWeek(lastSNM);

                        return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                            data: {
                                content: `Added \`${titleName}\` to the list`
                            }
                        });
                        // TODO: Followup with /movie
                    }
                    case 'remove': {
                        // Interaction first contact (to be edited)
                        // if silent - use ephemeral messages
                        if (silent) {
                            await client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 3,
                                    data: {
                                        content: `Removing title...`,
                                        flags: 64
                                    }
                                }
                            })
                        }
                        else if (!silent) {
                            await client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 5,
                                    data: {
                                        content: `Removing title...`,
                                    }
                                }
                            });
                        }

                        // If week is no longer "ongoing"
                        if (lastSNM.status != 'ongoing') {
                            return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                data: {
                                    content: `Can't modify \`Sunday Night Movie ${lastSNM.week}\` as it is \`${lastSNM.status}\``
                                }
                            });
                        }

                        // Removes a movie from the list
                        let stringFound;
                        let numberFound;
                        let checkNumber;
                        let deleted;

                        // Prioritize strings over numbers, as they are more specific.
                        // Movie can be "007" which would be a string and not position 7.
                        // If message is a number, we will save the titleKey that matches it. In case we don't find a string.
                        if (Number(titleName))
                            checkNumber = true;

                        // Checks if there is a movie with the same name as the message string
                        for (const userIndex in lastSNM.users) {
                            for (const movieIndex in lastSNM.users[userIndex].movies) {
                                if (lastSNM.users[userIndex].movies[movieIndex].title === titleName) {
                                    stringFound = true;
                                    // Checks if movie found was submitted by message author
                                    if (lastSNM.users[userIndex].userId === interaction.member.user.id)
                                        deleted = lastSNM.users[userIndex].movies.splice(movieIndex, 1);
                                    else {
                                        return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                            data: {
                                                content: `This is not your movie 😒`
                                            }
                                        });
                                    }
                                    break;
                                }
                                // If checkNumber is true and we didn't find a string yet. Check if titleKey matches user message.
                                // If it does, save indexes
                                else if (checkNumber) {
                                    if (Number(titleName) === lastSNM.users[userIndex].movies[movieIndex].titleKey)
                                        numberFound = [userIndex, movieIndex];
                                }
                            }
                        }

                        // If we didn't find a string but found a matching titleKey, try to delete
                        if (numberFound && !stringFound) {
                            // Checks if movie found was submitted by message author
                            if (lastSNM.users[numberFound[0]].userId === interaction.member.user.id)
                                deleted = lastSNM.users[numberFound[0]].movies.splice(numberFound[1], 1);
                            else {
                                return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                    data: {
                                        content: `This is not your movie 😒`
                                    }
                                });
                            }
                        }

                        // Fixes titleKeys and movieCount
                        if (deleted) {
                            deleted = deleted[0]
                            lastSNM.movieCount--;
                            for (const userIndex in lastSNM.users) {
                                for (const movieIndex in lastSNM.users[userIndex].movies) {
                                    if (lastSNM.users[userIndex].movies[movieIndex].titleKey > deleted.titleKey)
                                        lastSNM.users[userIndex].movies[movieIndex].titleKey--
                                }
                            }

                            await upsertSNMWeek(lastSNM);
                            return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                data: {
                                    content: `Removed \`${deleted.title}\` from the list`
                                }
                            });
                        }
                        else {
                            return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                data: {
                                    content: `Movie not found.\n\`/snm\` to see the list`
                                }
                            });
                        }
                    }
                }
            }
            catch (e) {
                reportError(e);
            }
        }
    }),
    /** @type {GuizzordeCommand} snmConfig - /snmConfig */
    snmConfig: new GuizzordeCommand({
        command: new _slashCommand({
            name: 'snmConfig',
            description: 'Change SNM settings for this Server',
            options: [
                {
                    type: 4,
                    name: 'max_entries',
                    description: 'Maximum number of entries allowed per user'
                },
                {
                    type: 4,
                    name: 'max_votes',
                    description: 'Maximum number of votes allowed per user'
                },
                {
                    type: 7,
                    name: 'default_channel',
                    description: 'Where should SNM messages be sent | Must be a text channel'
                },
                {
                    type: 5,
                    name: 'schedule',
                    description: 'Pauses or unpauses automatic SNM'
                },
                {
                    type: 3,
                    name: 'new',
                    description: 'When to create a new SNM Week | CRON format https://crontab.guru/ | Enter "default" for Monday 8AM'
                },
                {
                    type: 3,
                    name: 'start',
                    description: 'When to start SNM voting | CRON format https://crontab.guru/ | Enter "default" for Friday 8PM'
                },
                {
                    type: 3,
                    name: 'end',
                    description: 'When to end SNM voting | CRON format https://crontab.guru/ | Enter "default" for Saturday 8PM'
                }
            ]
        }),
        register: register,
        deregister: deregister,
        handler: async function (interaction) {
            try {
                // Cannot be used in DM
                if (!interaction.guild_id) {
                    return await client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: `Can't use this command a DM channel.`,
                                flags: 64
                            }
                        }
                    });
                }
                // If no parameter was passed
                else if (!interaction.data.options) {
                    return await client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 3,
                            data: {
                                content: `No option was passed`,
                                flags: 64
                            }
                        }
                    });
                }

                // Fetch guild and member (to ADMINISTRATOR check permission)
                const guildPerformed = await client.guilds.fetch(interaction.guild_id);
                const memberPerformed = await guildPerformed.members.fetch(interaction.member.user.id);

                // Can only be used by admins and bot self
                if (!memberPerformed.hasPermission('ADMINISTRATOR') || !interaction.member.user.id === client.user.id) {
                    return await client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 3,
                            data: {
                                content: `Insufficient permissions.`,
                                flags: 64
                            }
                        }
                    });
                }

                // First contact
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 3,
                        data: {
                            content: `Saving...`,
                            flags: 64
                        }
                    }
                });

                const cronRegex = /((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})|default/;
                const maxEntries = interaction.data.options?.find((arg => arg.name === 'max_entries'))?.value;
                const maxVotes = interaction.data.options?.find((arg => arg.name === 'max_votes'))?.value;
                const defaultChannel = interaction.data.options?.find((arg => arg.name === 'default_channel'))?.value;
                const running = interaction.data.options?.find((arg => arg.name === 'schedule'))?.value;
                const cronNew = interaction.data.options?.find((arg => arg.name === 'new'))?.value;
                const cronStart = interaction.data.options?.find((arg => arg.name === 'start'))?.value;
                const cronEnd = interaction.data.options?.find((arg => arg.name === 'end'))?.value;

                // If channel doesn't belong to this guild
                if (defaultChannel && client.channels.cache.get(defaultChannel)?.type !== 'text') {
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            content: `\`default_channel\` must be a text channel or bot has no access to it`
                        }
                    });
                }
                else if (cronNew && !cronRegex.test(cronNew)) {
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            content: `Invalid \`new\` CRON syntax. Visit https://crontab.guru/ for reference`
                        }
                    });
                }
                else if (cronStart && !cronRegex.test(cronStart)) {
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            content: `Invalid \`start\` CRON syntax. Visit https://crontab.guru/ for reference`
                        }
                    });
                }
                else if (cronEnd && !cronRegex.test(cronEnd)) {
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            content: `Invalid \`end\` CRON syntax. Visit https://crontab.guru/ for reference`
                        }
                    });
                }

                let snmServer = await getSNMServer(interaction.guild_id);

                // FIXME: Should be a better way to do this
                maxEntries ? snmServer.maxEntries = maxEntries : null;
                maxVotes ? snmServer.maxVotes = maxVotes : null;
                if (defaultChannel) {
                    snmServer.defaultChannel = defaultChannel;
                    // Certifies that we have all channels cached
                    client.guilds.fetch(interaction.guild_id, true, true);
                    client.channels.fetch(defaultChannel, true, true);
                }

                running ? snmServer.schedule.running = running : null;

                const SNMSchedule = SNMSchedulesArray.get(interaction.guild_id);
                if (cronNew) {
                    cronNew === 'default' ? snmServer.schedule.new = '0 8 * * 1' : snmServer.schedule.new = cronNew;
                    // Update cronJob if it exists
                    SNMSchedule?.cronNew.setTime(new CronTime(snmServer.schedule.new, 'America/Sao_Paulo'));
                    snmServer.schedule.running ? SNMSchedule?.cronNew.start() : null;
                }
                if (cronStart) {
                    cronStart === 'default' ? snmServer.schedule.start = '0 20 * * 5' : snmServer.schedule.start = cronStart;
                    // Update cronJob if it exists
                    SNMSchedule?.cronStart.setTime(new CronTime(snmServer.schedule.start, 'America/Sao_Paulo'));
                    snmServer.schedule.running ? SNMSchedule?.cronStart.start() : null;
                }
                if (cronEnd) {
                    cronEnd === 'default' ? snmServer.schedule.end = '0 20 * * 6' : snmServer.schedule.end = cronEnd;
                    // Update cronJob if it exists
                    SNMSchedule?.cronEnd.setTime(new CronTime(snmServer.schedule.end, 'America/Sao_Paulo'));
                    snmServer.schedule.running ? SNMSchedule?.cronEnd.start() : null;
                }

                // Doesn't work because undefined props were being set
                // snmServer = {
                //     ...snmServer,
                //     maxEntries: maxEntries,
                //     maxVotes: maxVotes,
                //     defaultChannel: defaultChannel,
                //     schedule: {
                //         running: running,
                //         new: cronNew,
                //         start: cronStart,
                //         end: cronEnd
                //     }
                // }

                snmServer = await upsertSNMServer(snmServer);

                if (running !== undefined) {
                    snmServer.toggleSchedule(running);
                }

                return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                    data: {
                        content: `Saved!`
                    }
                });

            }
            catch (e) {
                reportError(e);
            }

        }
    }),
    /** @type {GuizzordeCommand} snmRate - /snmRate <text> */
    snmRate: new GuizzordeCommand({
        command: new _slashCommand({
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
        }),
        register: register,
        deregister: deregister,
        handler: async function (interaction) {
            try {
                const rating = interaction.data.options?.find((arg => arg.name === 'rating'))?.value;

                // Sends to-be-edited message
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 5,
                        data: {
                            content: `Saving...`
                        }
                    }
                });

                const lastSNM = await getSNMWeek(interaction.guild_id);

                // Week doesn't exist
                if (!lastSNM.week) {
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            content: `No week to interact with.`
                        }
                    });
                }
                // Can only be done if week's SNM is finished
                else if (lastSNM.status !== 'finished') {
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            content: `Can't rate week \`${lastSNM.week}\` as it is still \`${lastSNM.status}\``
                        }
                    });
                }

                let userObject = lastSNM.users.find((user) => user.userId === interaction.member.user.id);

                // If new user
                if (!userObject)
                    userObject = lastSNM.users[lastSNM.users.push({ userId: interaction.member.user.id, username: interaction.member.user.username, movies: [], votes: [] }) - 1];

                userObject.rating = rating;

                await upsertSNMWeek(lastSNM);

                return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                    data: {
                        content: `Saved!`,
                        embeds: [
                            new Discord.MessageEmbed()
                                .setColor(0x3498DB)
                                .setAuthor(interaction.member.user.username, `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}` || 'https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png')
                                .setDescription(rating)
                                .setFooter(`SNM ${lastSNM.week} | ${new Date().toLocaleDateString('pt-BR')}`)
                        ]
                    }
                });
            }
            catch (e) {
                reportError(e);
            }
        }
    }),
    /** @type {GuizzordeCommand} snmVotes - /snmVotes <Show | Clear> */
    snmVotes: new GuizzordeCommand({
        command: new _slashCommand({
            name: 'snmVotes',
            description: 'Manage your current SNM votes',
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
        }),
        register: register,
        deregister: deregister,
        handler: async function (interaction) {
            try {
                const choice = interaction.data.options[0].value;

                // Sends to-be-edited message
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 3,
                        data: {
                            content: `Working...`,
                            flags: 64
                        }
                    }
                });

                const lastSNM = await getSNMWeek(interaction.guild_id);
                const userFound = lastSNM.users.find(user => user.userId === interaction.member.user.id);

                // Week doesn't exist
                if (!lastSNM.week) {
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            content: `No week to interact with.`
                        }
                    });
                }
                else if (!userFound || !userFound.votes || userFound.votes.length === 0) {
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            content: `You have not voted.`
                        }
                    });
                }

                if (choice === 'show') {
                    const moviesVoted = [];
                    userFound.votes.forEach(movieTitleKey => {
                        moviesVoted.push(`\`${lastSNM.users.find(user => user.movies.find(movie => movie.titleKey === movieTitleKey)).movies.find(movie => movie.titleKey === movieTitleKey).title}\``);
                    });
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            content: `Your votes: ${moviesVoted.join(" | ")}`
                        }
                    });
                }
                else if (choice === 'clear') {
                    if (lastSNM.status === 'finished') {
                        return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                            data: {
                                content: `SNM is finished. You can't alter your votes 👀.`
                            }
                        });
                    }
                    userFound.votes = [];
                    await upsertSNMWeek(lastSNM);
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            content: `Your votes have been cleared.`
                        }
                    });
                }

            }
            catch (e) {
                reportError(e);
            }
        }
    }),
    /**
     * Toggles SNM commands for specified server
     * @param {string} guildId - The Server ID to enable SNM
     * @param {boolean} enabled - If commands should be registered or deregistered
     */
    async toggleSNM(guildId, enabled) {
        if (enabled) {
            for (const command of Object.values(this)) {
                if (command === this.toggleSNM) continue;
                await command.register(command.command, guildId);
            }
        }
        else if (!enabled) {
            for (const command of Object.values(this)) {
                if (command === this.toggleSNM) continue;
                await command.deregister(command.command, guildId);
            }
        }
    }
}

export const snmEnable = new GuizzordeCommand({
    command: new _slashCommand(
        'snmEnable',
        'Enables or disables Sunday Night Movie',
        [
            {
                type: 5,
                name: "option",
                required: true,
                description: "True to enable | False to disable"
            }
        ]
    ),
    register: () => register(snmEnable.command),
    deregister: () => deregister(snmEnable.command),
    handler: async function (interaction) {
        try {
            // Cannot be used in DM
            if (!interaction.guild_id) {
                return await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: `Can't enable SNM in a DM channel.`,
                            flags: 64
                        }
                    }
                });
            }

            // Fetch guild and member (to ADMINISTRATOR check permission)
            const guildPerformed = await client.guilds.fetch(interaction.guild_id);
            const memberPerformed = await guildPerformed.members.fetch(interaction.member.user.id);

            // Can only be used by admins
            if (!memberPerformed.hasPermission('ADMINISTRATOR')) {
                return await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 3,
                        data: {
                            content: `Insufficient permissions.`,
                            flags: 64
                        }
                    }
                });
            }

            const option = interaction.data.options?.find((arg => arg.name === 'option')).value;

            if (option) {
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 3,
                        data: {
                            content: `SNM should be enabled shortly for this server! 🌵`,
                            flags: 64
                        }
                    }
                })
            }
            else if (!option) {
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 3,
                        data: {
                            content: `SNM should be disabled shortly for this server. ✌`,
                            flags: 64
                        }
                    }
                })
            }

            let snmServer = await getSNMServer(interaction.guild_id);

            // No SNMServer for this Server
            if (!snmServer.guildId) {
                snmServer = new SNMServer({
                    guildId: interaction.guild_id,
                    enabled: true,
                    defaultChannel: interaction.channel_id,
                    maxEntries: 1,
                    maxVotes: 2,
                    schedule: {
                        running: false,
                        new: '0 8 * * 1',
                        start: '0 20 * * 5',
                        end: '0 20 * * 6'
                    }
                })
            }
            snmServer.enabled = option;
            await upsertSNMServer(snmServer);
            await snmCommands.toggleSNM(interaction.guild_id, option);
        }
        catch (e) {
            reportError(e);
        }
    }
});

/**
 * Creates a SNM Week Embed
 * @param {SNMWeek} snmWeek 
 * @returns {Discord.MessageEmbed} An SNM week embed
 */
function snmEmbed(snmWeek) {
    // If snm is finished
    if (snmWeek.status === 'finished') {
        const printArray = [];
        let tempMovies = [];

        // runs through week and get movies, winner and ratings
        let description = `Status: **${snmWeek.paused ? 'paused' : snmWeek.status}**\n`;
        for (const userIndex in snmWeek.users) {
            // If user only voted - no entries or ratings = skip user on summary
            if (!snmWeek.users[userIndex].movies.length > 0 && !snmWeek.users[userIndex].rating) continue;
            printArray[userIndex] = `${snmWeek.users[userIndex].username} - \n`;
            // checks if user has movies and add it to printArray in the position of title key (to print in order in the end)
            if (snmWeek.users[userIndex].movies) {
                for (const movieIndex in snmWeek.users[userIndex].movies) {
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
        const printArray = [];

        // If status is finished, prints winner;
        // if (snmWeek.status === "finished" && snmWeek.winner.titleKey)
        //     description += `Winner: **${snmWeek.users.find(user => user.movies.find(movie => movie.titleKey === snmWeek.winner.titleKey)).movies.find(movie => movie.titleKey === snmWeek.winner.titleKey).title}**\n\n`;

        // Builds list ordered by titleKey
        for (const userIndex in snmWeek.users) {
            for (const movieIndex in snmWeek.users[userIndex].movies)
                printArray[snmWeek.users[userIndex].movies[movieIndex].titleKey - 1] = [`${snmWeek.users[userIndex].movies[movieIndex].titleKey}) ${snmWeek.users[userIndex].movies[movieIndex].title}\n`]
        }

        if (printArray.length === 0)
            printArray.push(`No movies requested yet 😢\n`);

        if (snmWeek.status === "ongoing")
            footer = `/snmTitle add to enter a movie`;
        else if (snmWeek.status === "finished")
            footer = `/snmRate to leave a rating`;
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
 * Gets the '@SNM' role, if it exists
 * @param {string} guildId - The guild (Server) ID
 * @returns {Discord.Role}
 */
async function getSNMRole(guildId) {
    await (await client.guilds.fetch(guildId)).roles.fetch();
    return client.guilds.cache.get(guildId).roles.cache.find(role => role.name.toUpperCase() === "SNM" || role.name.toUpperCase() === "SNM™");
}