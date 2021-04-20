import mongodb from 'mongodb';

import {
    SNMServer,
    SNMServerArray,
    SNMWeek,
    SNMWeekArray,
} from '../commands/index.js';
import {
    client,
    configObj,
} from '../config/index.js';

async function dbConnect() {
    return await mongodb.MongoClient.connect(configObj.mongodbURI, { useNewUrlParser: true })
}

/**
 * Gets a SNMWeek from the server
 * @param {string} guildId - The Server Id
 * @param {number} [week] - The specified week
 * @param {boolean} [status] - The status of the week
 * @returns {Promise<SNMWeek>} - The latest SNM week for the specified server
 */
export async function getSNMWeek(guildId, week, status) {
    try {
        const query = {
            guildId,
            ...week && { week: week },
            ...status && { status: status }
        }
        const mongoClient = await dbConnect();
        const snmWeek = new SNMWeek(
            await mongoClient.db(configObj.mongodbName)
                .collection(configObj.mongodbCollections[1])
                .findOne(query, { sort: { week: -1 } }) || {}
        );

        await mongoClient.close();

        // if there is a vote going on, add voting message to cache
        if (snmWeek?.voteMessage) {
            try {
                const channel = await client.channels.fetch(snmWeek.voteMessage.channelId);
                if (channel)
                    await channel.messages.fetch(snmWeek.voteMessage.messageId);
            }
            catch (e) {
                console.log(`Couldn't retrieve voteMessage of week ${snmWeek.week} from guild ${snmWeek.guildId}, maybe it was deleted?`);
            }

        }

        // Caches SNMWeek
        SNMWeekArray.set(snmWeek.guildId, snmWeek);
        return Promise.resolve(snmWeek);

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
        const week = new SNMWeek(res.value);
        // Updates SNMWeek Cache
        SNMWeekArray.set(week.guildId, week);
        return Promise.resolve(week);
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
        // Caches SNMServer
        SNMServerArray.set(snmServer.guildId, snmServer);
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
        const server = new SNMServer(res.value);
        // Updates SNMServer Cache
        SNMServerArray.set(server.guildId, server);
        return Promise.resolve(server);
    }
    catch (e) {
        return Promise.reject(e);
    }
}