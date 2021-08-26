import { User } from 'discord.js';
import mongodb from 'mongodb';

import { configObj } from '../../config/index.js';
import { reportError } from '../../util/index.js';
import {
    fireReminder,
    GuizzordeReminder,
} from '../index.js';

async function dbConnect() {
    return await mongodb.MongoClient.connect(configObj.mongodbURI, { useNewUrlParser: true })
}

/**
 * 
 * @param {number} reminderId The Reminder Id
 * @returns {Promise<[{userId: string, username: string}]>} The current subscribed users list
 */
export async function getSubscribedUsers(reminderId) {
    try {
        const mongodb = await dbConnect();
        const users = await mongodb.db(configObj.mongodbName)
            .collection(configObj.RemindMeCollection)
            .findOne(
                { reminderId: reminderId },
                { projection: { users: 1 } }
            );
        await mongodb.close();
        return Promise.resolve(users.users);
    }
    catch (e) {
        reportError(e);
        return Promise.reject(e);
    }
}

/**
 * Gets a single Reminder from the server
 * @param {number} reminderId The Reminder Id
 * @returns {Promise<GuizzordeReminder>} The requested Reminder
 */
export async function getReminder(reminderId) {
    try {
        const mongodb = await dbConnect();
        const reminder = new GuizzordeReminder(await mongodb.db(configObj.mongodbName)
            .collection(configObj.RemindMeCollection)
            .findOne(
                { reminderId }
            ));
        await mongodb.close();
        return Promise.resolve(reminder);
    }
    catch (e) {
        reportError(e);
        return Promise.reject(e);
    }
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
        return Promise.reject(e);
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

        // If nextReminder is PAST due -> fire Reminder and gets next
        if (new Date().getTime() / 1000 > reminder?.date) {
            await fireReminder(reminder);
            return Promise.resolve(await getNextReminder());
        };

        return Promise.resolve(reminder);
    }
    catch (e) {
        reportError(e);
        return Promise.reject(e);
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
        return Promise.reject(e);
    }
}

/**
 * Retrieves a list with *not fired* Reminders
 * @returns {Promise<string[{reminderId: number, messageId: string}]>} Set of *not fired* reminderId's
*/
export async function getReminderList() {
    try {
        /**
         * Maps to message.messageId
         * @param {Partial<GuizzordeReminder>} item 
        */
        const mapFunc = (item) => {
            return { reminderId: item.reminderId, messageId: item.message.messageId };
        }

        const mongodb = await dbConnect();
        const reminderList = await mongodb.db(configObj.mongodbName)
            .collection(configObj.RemindMeCollection)
            .find(
                { fired: false, "message.messageId": { $ne: null } },
                {
                    sort: { reminderId: 1 },
                    projection: { reminderId: 1, "message.messageId": 1 }
                }
            )
            .map(mapFunc)
            .toArray();
        mongodb.close();
        return Promise.resolve(reminderList);
    }
    catch (e) {
        reportError(e);
        return Promise.reject(e);
    }
}

/**
 * Toggles a User from GuizzordeReminder.users array
 * @param {number} reminderId The Reminder Id
 * @param {User} user The User to subscribe or unsubscribe
 * @param {"add"|"remove"} operation The toggle operation
 */
export async function toggleUserSubscription(reminderId, user, operation) {
    try {
        const mongodb = await dbConnect();
        if (operation === "add") {
            await mongodb.db(configObj.mongodbName)
                .collection(configObj.RemindMeCollection)
                .updateOne(
                    { reminderId: reminderId },
                    { $addToSet: { users: { userId: user.id, username: user.username } } }
                )
            user.send({ content: 'Subscribed! You will be notified via DM.' });
        }
        else if (operation === "remove") {
            await mongodb.db(configObj.mongodbName)
                .collection(configObj.RemindMeCollection)
                .updateOne(
                    { reminderId: reminderId },
                    { $pull: { users: { userId: user.id, username: user.username } } }
                )
            user.send({ content: 'You have been unsubscribed' });
        }
        mongodb.close();

    }
    catch (e) {
        reportError(`Failed to toggle ${user.username}'s Subscription of Reminder: ${reminderId}\n${e}`);
    }
}

/**
 * Returns a list with all the User's current subscribed reminders
 * @param {number} userId The User to get subscribed reminders
 * @returns {Promise<Partial<GuizzordeReminder>[]>} The current subscribed users list
 */
export async function getUserSubscriptionList(userId) {
    try {
        const mongodb = await dbConnect();
        const userSubList = await mongodb.db(configObj.mongodbName)
            .collection(configObj.RemindMeCollection)
            .find(
                { fired: false, "users.userId": userId },
                { projection: { message: 0, "users.userId": 0 } }
            ).toArray();
        await mongodb.close();
        return Promise.resolve(userSubList);
    }
    catch (e) {
        reportError(e);
        return Promise.reject(e);
    }
}
