import mongodb from 'mongodb';

import { SNMWeek } from '../commands/Sunday Night Movie/index.js';
import { SNMServer } from '../commands/Sunday Night Movie/SNMServer.class.js';
import { configObj, client } from '../config/index.js';

async function dbConnect() {
    return await mongodb.MongoClient.connect(configObj.mongodbURI, { useNewUrlParser: true })
}

/**
 * Gets a SNMWeek from the server
 * @param {string} guildId - The Server Id
 * @param {number} [week] - The specified week
 * @returns {Promise<SNMWeek>} - The latest SNM week for the specified server
 */
export async function getSNMWeek(guildId, week) {
    try {
        let lastSNM = null;
        const mongoClient = await dbConnect();
        if (week)
            lastSNM = new SNMWeek(await mongoClient.db(configObj.mongodbName).collection(configObj.mongodbCollections[1]).findOne({ guildId, week }) || {});
        else
            lastSNM = new SNMWeek(await mongoClient.db(configObj.mongodbName).collection(configObj.mongodbCollections[1]).findOne({ guildId }, { sort: { week: -1 }, limit: 1 }));
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
 * Upserts a SNMWeek into the server
 * @param {SNMWeek} snmWeek - The SNMWeek to be upserted
 * @returns {Promise<SNMWeek>} - The upserted SNMWeek
 */
export async function upsertSNMWeek(snmWeek) {
    try {
        const mongodb = await dbConnect();
        const res = await mongodb.db(configObj.mongodbName)
            .collection(configObj.mongodbCollections[1])
            .findOneAndUpdate({
                guildId: snmWeek.guildId, week: snmWeek.week
            }, {
                $set: snmWeek
            }, {
                upsert: true,
                returnOriginal: false
            });
        mongodb.close();
        return Promise.resolve(new SNMWeek(res.value));
    }
    catch (e) {
        return Promise.reject(e);
    }
}

/**
 * Gets a SNMServer from the database
 * @param {string} guildId - The Server Id
 * @returns {Promise<SNMServer>} - The upserted SNMWeek
 * 
 */
export async function getSNMServer(guildId) {
    try {
        let snmServer = null;
        const mongodb = await dbConnect();
        snmServer = new SNMServer(await mongodb.db(configObj.mongodbName)
            .collection(configObj.mongodbCollections[0])
            .findOne({ guildId }) || {});
        await mongodb.close();
        return Promise.resolve(snmServer);
    }
    catch (e) {
        return Promise.reject(e);
    }
}

/**
 * Upserts a SNMServer into the database
 * @param {SNMServer} snmServer - The SNMServer to be upserted
 * @returns {Promise<SNMServer} - The upserted SNMServer
 */
export async function upsertSNMServer(snmServer) {
    try {
        const mongodb = await dbConnect();
        const res = await mongodb.db(configObj.mongodbName)
            .collection(configObj.mongodbCollections[0])
            .findOneAndUpdate({
                guildId: snmServer.guildId
            }, {
                $set: snmServer
            }, {
                upsert: true,
                returnOriginal: false
            });
        mongodb.close();
        return Promise.resolve(new SNMServer(res.value));
    }
    catch (e) {
        return Promise.reject(e);
    }
}