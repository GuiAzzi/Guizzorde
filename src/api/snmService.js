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
        let res;
        if (week)
            res = await mongoClient.db(configObj.mongodbName).collection(configObj.mongodbCollection).findOne({ guildId, week });
        else
            res = await mongoClient.db(configObj.mongodbName).collection(configObj.mongodbCollection).findOne({ guildId: guildId }, { sort: { week: -1 }, limit: 1 });
        await mongoClient.close();

        if (!res) {
            return Promise.reject('No data found');
        }
        else {
            lastSNM = new SNMWeek(res.guildId, res.week, res.status, res.movieCount, res.paused, res?.users, res?.winner, res?.voteMessage, res?.emojiUsed);
            // if there is a vote going on, add voting message to cache
            if (lastSNM.voteMessage) {
                try {
                    const channel = await client.channels.fetch(lastSNM.voteMessage.channelId);
                    if (channel)
                        await channel.messages.fetch(lastSNM.voteMessage.messageId);
                }
                catch (e) {
                    console.log(`Couldn't retrieve voteMessage channel or message, maybe it was deleted?`);
                }

            }
            return Promise.resolve(lastSNM);
        }

        //     // Schedule SNM Comands
        //     if (!lastSnm.paused) {
        //         snmToggleJobs(true);
        //     }
    }
    catch (e) {
        reportError(e);
    }
}

/**
 * 
 * @param {SNMWeek} newSNM - The new week to be inserted
 */
export async function insertNewSNM(newSNM) {
    try {
        const mongodb = await dbConnect();
        const res = await mongodb.db(configObj.mongodbName).collection(configObj.mongodbCollection).insertOne(newSNM);
        mongodb.close();
        return Promise.resolve(res.ops[0]);
    }
    catch (e) {
        reportError(e);
        return Promise.reject(e);
    }
}