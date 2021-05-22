import * as chrono from 'chrono-node';
import { CronTime } from 'cron';
import {
    Message,
    MessageEmbed,
} from 'discord.js';

import {
    client,
    configObj,
} from '../../config/index.js';
import { reportError } from '../../util/index.js';
import {
    _slashCommand,
    deregister,
    GuizzordeCommand,
    GuizzordeReminder,
    register,
    reminders,
    upsertReminder,
} from '../index.js';

export const remindMeCommands = {
    /** @type {GuizzordeCommand} remindMe - /remindMe <note> <date> [private] */
    remindMe: new GuizzordeCommand({
        command: new _slashCommand({
            name: 'remindme',
            description: `Set a new reminder! Reminders created via DM's are always private.`,
            options: [
                {
                    type: 3,
                    name: 'note',
                    required: true,
                    description: 'What would you like to be reminded of?'
                },
                {
                    type: 3,
                    name: 'date',
                    required: true,
                    description: 'When would you want to be reminded? | Ex: "Tomorrow", "In five days", "17 August 2013"'
                },
                {
                    type: 5,
                    name: 'private',
                    description: 'Whether other people can see and subscribe to this reminder'
                }
            ]
        }),
        register: register,
        deregister: deregister,
        handler: async function (interaction) {
            try {
                const note = interaction.data.options?.find((arg => arg.name === 'note'))?.value;
                const date = interaction.data.options?.find((arg => arg.name === 'date'))?.value;
                const privateFlag = interaction.data.options?.find((arg => arg.name === 'private'))?.value ? 64 : null;

                // deferred response | type 5
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 5,
                        data: {
                            flags: privateFlag
                        }
                    }
                });

                // Gets original msg
                const originalMsg = privateFlag ? null : await client.api.webhooks(configObj.appId, interaction.token).messages('@original').get();

                // Try to parse date in english first then in pt
                const parsedDate = chrono.parseDate(date) || chrono.pt.parseDate(date);

                // If failed to parse
                if (!parsedDate) {
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            embeds: [
                                new MessageEmbed()
                                    .setTitle(`Reminder Error`)
                                    .setDescription(`Couldn't understand \`date\` input`)
                                    .setColor("RED")
                            ],
                            flags: privateFlag
                        }
                    });
                }
                else if (Date.now() > parsedDate.getTime()) {
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            embeds: [
                                new MessageEmbed()
                                    .setTitle(`Reminder Error`)
                                    .setDescription(`\`date\` can't be in the past`)
                                    .setColor("RED")
                            ],
                            flags: privateFlag
                        }
                    });
                }

                // Creates new reminder
                let newReminder = new GuizzordeReminder({
                    reminderId: reminders.lastReminder?.reminderId + 1 || 1,
                    message: {
                        channelId: interaction.channel_id,
                        messageId: privateFlag ? null : originalMsg.id
                    },
                    users: [{
                        // If invoked via DM, user is passed; if on guild, member is passed
                        userId: interaction.user?.id || interaction.member.user.id,
                        user: interaction.user?.username || interaction.member.user.username
                    }],
                    text: note,
                    date: parsedDate.getTime() / 1000,
                    fired: false,
                    private: privateFlag ? true : false
                });

                // Upserts to server
                newReminder = await upsertReminder(newReminder);

                // Set newly created reminder as lastReminder - last ID created
                reminders.lastReminder = newReminder;
                // If newly created reminder should be fired before "current" nextReminder - set as nextReminder
                if (!reminders.nextReminder?.reminderId || newReminder.date < reminders.nextReminder.date) {
                    reminders.nextReminder = newReminder;
                    reminders.reminderJob.setTime(new CronTime(new Date(reminders.nextReminder.date * 1000), 'America/Sao_Paulo'));
                    reminders.reminderJob.start();
                }

                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                    data: {
                        embeds: [
                            new MessageEmbed()
                                .setTitle(`📅 New Reminder 📅`)
                                .setDescription(note)
                                .setTimestamp(parsedDate.toJSON())
                                .setColor(0x3498DB)
                        ],
                        flags: privateFlag
                    }
                });

                // React on newReminder message to allow subscribers
                if (newReminder.message?.messageId && newReminder.private === false) {
                    // Creates discord.js Message object from @original
                    const djsOriginalMsg = new Message(client, originalMsg, client.channels.cache.get(originalMsg.channel_id));

                    const filter = (user) => {
                        return user.id !== djsOriginalMsg.author.id;
                    }

                    await djsOriginalMsg.react('🔔');
                    const collector = djsOriginalMsg.createReactionCollector(filter, { time: 60000, dispose: true });
                    collector.on('collect', (reaction, user) => {
                        if (reaction.emoji.name !== '🔔')
                            return reaction.remove();

                        // TODO: Subscribe user

                        console.log(`Subscribed ${user.username} to ${newReminder.reminderId}`);
                    });
                    collector.on('remove', (reaction, user) => {
                        // TODO: Unsubscribe user
                        console.log(`Unsubscribed ${user.username} from ${newReminder.reminderId}`);
                    });
                    collector.on('end', () => {
                        djsOriginalMsg.reactions.removeAll();
                    });
                }
            }
            catch (e) {
                reportError(e)
            }
        }
    })
}