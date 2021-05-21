import {
    CronJob,
    CronTime,
} from 'cron';
import { MessageEmbed } from 'discord.js';

import { client } from '../../config/index.js';
import { reportError } from '../../util/index.js';
import {
    getLastReminder,
    getNextReminder,
    upsertReminder,
} from './index.js';

export class GuizzordeReminder {
    /**
     * @param {GuizzordeReminder} params
     */
    constructor(params) {
        /** @type {number} The Reminder's ID - Incremental number */
        this.reminderId = params.reminderId;
        /** @type {string} The Reminder's Message's ID - For editing later */
        this.messageId = params.messageId;
        /** @type {[{userId: string, username: string}]} Array of users to be reminded */
        this.users = params.users;
        /** @type {string} The Reminder's text */
        this.text = params.text;
        /** @type {number} The Reminder's due date in UNIX time */
        this.date = params.date;
        /** @type {boolean} Whether the reminder has been fired or not */
        this.fired = params.fired;
    }
}

/** 
 * Fires a Reminder to all users subscribed
 * @param {GuizzordeReminder} reminder The Reminder to be fired
 */
export async function fireReminder(reminder) {
    try {
        for (const user of reminder.users) {
            await client.users.fetch(user.userId)
                .then(user => user.send(
                    new MessageEmbed()
                        .setTitle(`⏰ RemindMe Notification! ⏰`)
                        .setDescription(reminder.text)
                        .setColor(0x3498DB)
                        .setTimestamp(new Date().toJSON())
                ));
        }

        reminder.fired = true;
        await upsertReminder(reminder);
        console.log(`Fired Reminder with ID ${reminder.reminderId} to ${reminder.users.length} users`);
    }
    catch (e) {
        reminder.error = true;
        reminder.fired = true;
        await upsertReminder(reminder);
        reportError(e);
    }
}

// In-Memory Stuff
/** @type {{nextReminder: GuizzordeReminder, lastReminder: GuizzordeReminder, reminderJob: CronJob|null} */
const reminders = {
    nextReminder: null,
    lastReminder: null,
    reminderJob: null,
}

export const setReminders = async () => {
    reminders.nextReminder = await getNextReminder(),
        reminders.lastReminder = await getLastReminder(),
        reminders.reminderJob = reminders.nextReminder ? new CronJob(
            new Date(reminders.nextReminder.date * 1000),
            async () => {
                try {
                    await fireReminder(reminders.nextReminder)
                    reminders.nextReminder = await getNextReminder();

                    // Sets time for nextReminder and start it, if it exists
                    if (reminders.nextReminder?.reminderId) {
                        reminders.reminderJob.setTime(new CronTime(new Date(reminders.nextReminder.date * 1000), 'America/Sao_Paulo'));
                        reminders.reminderJob.start();
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