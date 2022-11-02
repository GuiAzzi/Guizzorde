import * as chrono from 'chrono-node';
import {
    CronJob,
    CronTime,
} from 'cron';
import {
    CommandInteraction,
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
    getLastReminder,
    getNextReminder,
    getReminder,
    getReminderList,
    getSubscribedUsers,
    getUserSubscriptionList,
    GuizzordeCommand,
    GuizzordeReminder,
    register,
    Reminders,
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
                },
                // TODO:
                // {
                //     type: 4,
                //     name: 'timezone',
                //     description: 'Your timezone | Default is Brazil',
                //     choices: [
                //         {
                //             name: 'Germany',
                //             value: 
                //         },
                //         {
                //             name: 'Canada',
                //             value: 180
                //         },
                //         {
                //             name: 'Brazil',
                //             value: -180
                //         }
                //     ]
                // }
            ]
        }),
        register: register,
        deregister: deregister,
        /** @param {CommandInteraction} interaction */
        handler: async function (interaction) {
            try {
                const note = interaction.options.getString('note');
                const date = interaction.options.getString('date');
                const _private = interaction.options.getBoolean('private') || interaction.inGuild() ? false : true;
                const timeZone = interaction.options.getInteger('timezone') || -180;

                // deferred response | type 5
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 5,
                        data: {
                            flags: _private ? 64 : null
                        }
                    }
                });

                // Gets original msg
                const originalMsg = _private ? null : await client.api.webhooks(configObj.appId, interaction.token).messages('@original').get();

                // Creates a custom Chrono Refiner so we can set the expected utcOffset
                const custom = new chrono.Chrono();
                custom.refiners.push({
                    refine: (text, results, opt) => {
                        results.forEach(r => {
                            r.start.imply('timezoneOffset', timeZone);
                            r.end && r.end.imply('timezoneOffset', timeZone)
                        })
                        return results;
                    }
                });

                // Try to parse date in english first then in pt
                const parsedDate = custom.parseDate(date) || chrono.pt.parse(date);

                // If failed to parse
                if (!parsedDate || parsedDate.length === 0) {
                    console.log(`Couldn't understand "${date}" input`);
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            embeds: [
                                new MessageEmbed()
                                    .setTitle(`Reminder Error`)
                                    .setDescription(`Couldn't understand \`date\` input`)
                                    .setColor("RED")
                            ],
                            flags: _private ? 64 : null
                        }
                    });
                }
                else if (Date.now() > parsedDate.getTime()) {
                    console.log(`Date is past. Now: ${Date.now()} | Input: ${parsedDate.getTime()}`);
                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            embeds: [
                                new MessageEmbed()
                                    .setTitle(`Reminder Error`)
                                    .setDescription(`\`date\` can't be in the past`)
                                    .setColor("RED")
                            ],
                            flags: _private ? 64 : null
                        }
                    });
                }

                // Creates new Reminder
                let newReminder = new GuizzordeReminder({
                    reminderId: Reminders.lastReminder?.reminderId + 1 || 1,
                    ownerId: interaction.user?.id || interaction.member.user.id,
                    message: {
                        channelId: interaction.channelId,
                        messageId: _private ? null : originalMsg.id
                    },
                    // If invoked via DM (.user present); if on guild (.member present)
                    users: [{
                        userId: interaction.user?.id || interaction.member.user.id,
                        username: interaction.user?.username || interaction.member.user.username
                    }],
                    text: note,
                    date: parsedDate.getTime() / 1000,
                    fired: false,
                    private: _private
                });

                // Upserts to server
                newReminder = await upsertReminder(newReminder);

                // Set newly created Reminder as lastReminder - last ID created
                Reminders.lastReminder = newReminder;
                // If newly created Reminder should be fired before "current" nextReminder - set as nextReminder
                if (!Reminders.nextReminder?.reminderId || newReminder.date < Reminders.nextReminder.date) {
                    Reminders.nextReminder = newReminder;
                    Reminders.reminderJob.setTime(new CronTime(new Date(Reminders.nextReminder.date * 1000), 'America/Sao_Paulo'));
                    Reminders.reminderJob.start();
                }

                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                    data: {
                        embeds: [
                            new MessageEmbed()
                                .setTitle(`📅 Reminder Created 📅`)
                                .setDescription(note)
                                .setColor(0x3498DB)
                                .setFooter(!_private ? `Click the bell to subscribe` : "")
                                .setTimestamp(parsedDate.toJSON())
                        ],
                        flags: _private ? 64 : null
                    }
                });

                // React on newReminder message to allow subscribers
                if (newReminder.message?.messageId && newReminder.private === false) {
                    // Creates discord.js Message object from @original
                    const djsOriginalMsg = new Message(client, originalMsg, client.channels.cache.get(originalMsg.channel_id));

                    await djsOriginalMsg.react('🔔');
                    Reminders.idList.set(newReminder.message.messageId, newReminder.reminderId);

                    // Replaced with client.on(messageReactionAdd) and client.on(messageReactionRemoved)
                    // This choice was made because the collector reference is lost upon bot restart
                    // Whereas in the new logic we have controll of any *not fired* Reminder at maybe the cost of
                    // some memory. Still could prove useful as the same system can be used for SNM VoteMessages

                    // const filter = (user) => {
                    //     return user.id !== djsOriginalMsg.author.id;
                    // }

                    // const collector = djsOriginalMsg.createReactionCollector(filter, { dispose: true });
                    // collector.on('collect', (reaction, user) => {
                    //     if (reaction.emoji.name !== '🔔')
                    //         return reaction.remove();

                    //     // Subscribe user

                    //     console.log(`Subscribed ${user.username} to ${newReminder.reminderId}`);
                    // });
                    // collector.on('remove', (reaction, user) => {
                    //     // Unsubscribe user
                    //     console.log(`Unsubscribed ${user.username} from ${newReminder.reminderId}`);
                    // });
                    // collector.on('end', () => {
                    //     djsOriginalMsg.reactions.removeAll();
                    // });
                }
                console.log(`Reminder ${newReminder.reminderId} created for ${parsedDate.toJSON()}`);
            }
            catch (e) {
                reportError(e)
            }
        }
    }),
    remindMeList: new GuizzordeCommand({
        command: new _slashCommand({
            name: 'remindme_list',
            description: `See your subscribed Reminders or send an existing Reminder so people can subscribe to it`,
            options: [
                {
                    type: 4,
                    name: 'id',
                    required: false,
                    description: 'Specify a Reminder ID to display on this channel | Atention: This makes the Reminder public!'
                }
            ]
        }),
        register: register,
        deregister: deregister,
        /** @param {CommandInteraction} interaction */
        handler: async function (interaction) {
            try {
                const id = interaction.options.getInteger('id');
                const requestingUserId = interaction.user?.id || interaction.member.user.id;

                // deferred response | type 5
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 5,
                        data: {
                            flags: id ? null : 64
                        }
                    }
                });

                // Show all subscribed reminders
                if (!id) {
                    const userSubList = await getUserSubscriptionList(requestingUserId);
                    const userSubListEmbed = new MessageEmbed().setTitle('Subscribed Reminders').setColor(0x3498DB);
                    // If array is empty - user is not subscribed to any Reminder
                    if (userSubList.length === 0) {
                        userSubListEmbed.setDescription('No subscribed Reminders');
                    }
                    else {
                        // Makes Embed Description Array containing subscribed Reminders data
                        const subscribedArray = [];
                        for (const item of userSubList) {
                            subscribedArray.push(`📅 ID: ${item.reminderId}\n📝 ${item.text}\n⏰ ${new Date(item.date * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} BRT${item.ownerId === requestingUserId ? `\n🙂 ${item.users.map(e => e.username).join(', ')}` : ''}${item.private ? '\n🔒 Private' : '\n🔓 Public'}\n`);
                        }
                        userSubListEmbed.setDescription(String(subscribedArray));
                    }

                    return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            embeds: [userSubListEmbed],
                            flags: 64
                        }
                    });
                }
                else {
                    // Get Reminder
                    let reminder = await getReminder(id);
                    const oldMessageId = reminder.message.messageId;

                    // If Reminder is private and requestingUser is not the owner
                    if (reminder.private && requestingUserId != reminder.ownerId) {
                        await client.api.webhooks(configObj.appId, interaction.token).messages('@original').delete();
                        return await client.api.webhooks(configObj.appId, interaction.token).post({
                            data: {
                                content: `This Reminder is private and only the owner can display it`,
                                flags: 64
                            }
                        });
                    }
                    // If Reminder is public or requestingUser ir owner - send Reminder Invitation and updates properties
                    else {
                        // Get new Reminder MessageId and ChannelId
                        const newReminderMsg = await client.api.webhooks(configObj.appId, interaction.token).messages('@original').get();
                        reminder.message = {
                            channelId: interaction.channelId,
                            messageId: newReminderMsg.id
                        }
                        reminder.private = false;
                        reminder = await upsertReminder(reminder);

                        await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                            data: {
                                embeds: [
                                    new MessageEmbed()
                                        .setTitle(`📅 Reminder Invitation 📅`)
                                        .setDescription(reminder.text)
                                        .setColor(0x3498DB)
                                        .setFooter(`Click the bell to subscribe`)
                                        .setTimestamp(new Date(reminder.date * 1000).toJSON())
                                ]
                            }
                        });

                        // Creates discord.js Message object from @original
                        const djsNewReminderMsg = new Message(client, newReminderMsg, client.channels.cache.get(newReminderMsg.channel_id));
                        await djsNewReminderMsg.react('🔔');

                        Reminders.idList.delete(oldMessageId);
                        Reminders.idList.set(reminder.message.messageId, reminder.reminderId);
                    }
                }

            }
            catch (e) {
                reportError(e)
            }
        }
    })
}

/** 
 * Fires a Reminder to all users subscribed
 * @param {GuizzordeReminder} reminder The Reminder to be fired
 */
export async function fireReminder(reminder) {
    try {
        // Gets updated subscribed user list
        reminder.users = await getSubscribedUsers(reminder.reminderId);
        for (const user of reminder.users) {
            await client.users.fetch(user.userId)
                .then(user => user.send({
                    embeds: [
                        new MessageEmbed()
                            .setTitle(`⏰ RemindMe Notification ⏰`)
                            .setDescription(reminder.text)
                            .setColor(0x3498DB)
                            .setTimestamp(new Date().toJSON())
                    ]
                }))
                .catch(e => reportError(e));
        }

        // Upserts fired Reminder to the server
        reminder.fired = true;
        await upsertReminder(reminder);

        // Basically means if "Guild Reminder" | not "DM Reminder"
        if (reminder.message.messageId) {
            // Removes from idList, works if present or not
            Reminders.idList.delete(reminder.message.messageId);

            // See if channel and message exists
            try {
                /** @type {Message} */
                const reminderMsg = await (await client.channels.fetch(reminder.message.channelId)).messages.fetch(reminder.message.messageId);
                // Removes 🔔 from Reminder's message
                reminderMsg.reactions.cache.get('🔔').remove();
                reminderMsg.edit(reminderMsg.embeds[0].setFooter(''));
            }
            catch (e) {
                console.log(`Couldn't retrieve Reminder ${reminder.reminderId} message, maybe it was deleted?`);
            }
        }

        console.log(`Fired Reminder with ID ${reminder.reminderId} to ${reminder.users.length} user(s)`);
    }
    catch (e) {
        reminder.error = true;
        reminder.fired = true;
        await upsertReminder(reminder);
        reportError(e);
    }
}

/**
 * Sets initial Reminders memory object values
*/
export const setReminders = async () => {
    Reminders.idList = new Map((await getReminderList()).map(i => [i.messageId, i.reminderId]));
    Reminders.nextReminder = await getNextReminder();
    Reminders.lastReminder = await getLastReminder();
    Reminders.reminderJob = Reminders.nextReminder ? new CronJob(
        new Date(Reminders.nextReminder.date * 1000),
        async () => {
            try {
                await fireReminder(Reminders.nextReminder)
                Reminders.nextReminder = await getNextReminder();

                // Sets time for nextReminder and start it, if it exists
                if (Reminders.nextReminder?.reminderId) {
                    Reminders.reminderJob.setTime(new CronTime(new Date(Reminders.nextReminder.date * 1000), 'America/Sao_Paulo'));
                    Reminders.reminderJob.start();
                }
            }
            catch (e) {
                reportError(e);
            }
        },
        null,
        true,
        'America/Sao_Paulo'
    ) : null;
};