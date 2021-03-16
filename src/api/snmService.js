import mongodb from 'mongodb';

import SNMWeek from '../commands/Sunday Night Movie/SNMWeek.class.js';
import configObj, { client } from '../config/Config.class.js';
import { reportError } from '../util/index.js';

async function dbConnect() {
    return await mongodb.MongoClient.connect(configObj.mongodbURI, { useNewUrlParser: true })
}

/**
 * 
 * @param {string} guildId
 * @param {number} [week]
 * @returns {Promise<SNMWeek>} - The latest SNM week for the specified server
 */
export async function getSNMWeek(guildId, week) {
    try {
        let lastSNM = null;
        const mongoClient = await dbConnect();
        if (week)
            lastSNM = new SNMWeek(await mongoClient.db(configObj.mongodbName).collection(configObj.mongodbCollection).findOne({ guildId, week }) || {});
        else
            lastSNM = new SNMWeek(await mongoClient.db(configObj.mongodbName).collection(configObj.mongodbCollection).findOne({ guildId: guildId }, { sort: { week: -1 }, limit: 1 }));
        await mongoClient.close();

        // if there is a vote going on, add voting message to cache
        if (lastSNM?.voteMessage) {
            try {
                const channel = await client.channels.fetch(lastSNM.voteMessage.channelId);
                if (channel)
                    await channel.messages.fetch(lastSNM.voteMessage.messageId);
            }
            catch (e) {
                console.log(`Couldn't retrieve voteMessage channel or message, maybe it was deleted?`);
            }

        }

        // TODO:
        //     // Schedule SNM Comands
        //     if (!lastSnm.paused) {
        //         snmToggleJobs(true);
        //     }

        return Promise.resolve(lastSNM);

    }
    catch (e) {
        Promise.reject(e);
    }
}

/**
 * 
 * @param {SNMWeek} newSNM - The new week to be inserted
 * @returns {SNMWeek} - The inserted snm week
 */
export async function upsertSNMWeek(newSNM) {
    try {
        const mongodb = await dbConnect();
        const res = await mongodb.db(configObj.mongodbName).collection(configObj.mongodbCollection).insertOne(newSNM);
        mongodb.close();
        return Promise.resolve(new SNMWeek(res.ops[0]));
    }
    catch (e) {
        reportError(e);
        return Promise.reject(e);
    }
}