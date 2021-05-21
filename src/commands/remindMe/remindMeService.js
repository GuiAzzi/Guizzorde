import mongodb from 'mongodb';

import { configObj } from '../../config/index.js';
import { reportError } from '../../util/index.js';
import { GuizzordeReminder } from '../index.js';
import { fireReminder } from './reminder.class.js';

async function dbConnect() {
    return await mongodb.MongoClient.connect(configObj.mongodbURI, { useNewUrlParser: true })
}

/**
 * Upserts a Reminder into the server
 * @param {GuizzordeReminder} reminder - The Reminder to be upserted
 * @returns {Promise<GuizzordeReminder>} - The upserted Reminder
 */
export async function upsertReminder(reminder) {
    try {
        const mongodb = await dbConnect();
        const res = await mongodb.db(configObj.mongodbName)
            .collection(configObj.RemindMeCollection)
            .findOneAndUpdate({
                reminderId: reminder.reminderId
            }, {
                $set: reminder
            }, {
                upsert: true,
                returnOriginal: false
            });
        await mongodb.close();

        const upsertedReminder = new GuizzordeReminder(res.value);
        return Promise.resolve(upsertedReminder);
    }
    catch (e) {
        reportError(e);
    }
}

/**
 * Gets the next not-fired Reminder from the server
 * @returns {Promise<GuizzordeReminder>} The next Reminder
 */
export async function getNextReminder() {
    try {
        const mongodb = await dbConnect();
        const reminder = new GuizzordeReminder(
            await mongodb.db(configObj.mongodbName)
                .collection(configObj.RemindMeCollection)
                .findOne({ fired: false }, { sort: { date: 1 } }) || {}
        );
        await mongodb.close();

        // If nextReminder is PAST due -> fire reminder and gets next
        if (new Date().getTime() / 1000 > reminder?.date) {
            await fireReminder(reminder);
            return Promise.resolve(await getNextReminder());
        };

        return Promise.resolve(reminder);
    }
    catch (e) {
        reportError(e);
    }
}

/**
 * Gets the last Reminder inserted into the server | Highest reminderId
 * @returns {Promise<GuizzordeReminder>} The last inserted Reminder
 */
export async function getLastReminder() {
    try {
        const mongodb = await dbConnect();
        const reminder = new GuizzordeReminder(
            await mongodb.db(configObj.mongodbName)
                .collection(configObj.RemindMeCollection)
                .findOne(null, { sort: { reminderId: -1 } }) || {}
        );
        await mongodb.close();

        return Promise.resolve(reminder);
    }
    catch (e) {
        reportError(e);
    }
}
