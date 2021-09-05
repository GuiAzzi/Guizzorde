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
        return Promise.reject(e);
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

/**
 * Retrieves a list with all the past winner's titles from a guild
 * @param {string} guildId The guild Id
 * @returns {Promise<string>} Array containing all winner's titles
*/
export async function getWinnersList(guildId) {
    try {
        // Holds the score data
        /** @type {{userId: {username: string, wins: number}}} */
        const scoreBoard = {};

        /**
         * Maps results and gets the winner's title
         * @param {Partial<SNMWeek>} item 
        */
        const mapFunc = (item) => {
            const winnerUser = item.users.find(user => user.movies.find(movie => movie.titleKey === item.winner.titleKey));
            if (!scoreBoard[winnerUser.userId]) {
                scoreBoard[winnerUser.userId] = {
                    username: winnerUser.username,
                    wins: 0
                };
            }
            scoreBoard[winnerUser.userId] = {
                username: winnerUser.username,
                wins: scoreBoard[winnerUser.userId].wins += 1
            };
            return `${item.week} - ${winnerUser.movies.find(movie => movie.titleKey === item.winner.titleKey).title} | ${winnerUser.username}`;
        }

        const mongodb = await dbConnect();
        const winnerList = await mongodb.db(configObj.mongodbName)
            .collection(configObj.mongodbCollections[1])
            .find(
                {
                    guildId: guildId,
                    status: 'finished'
                },
                {
                    sort: { week: 1 },
                    projection: { winner: 1, users: 1, week: 1 }
                }
            )
            .map(mapFunc)
            .toArray();
        mongodb.close();

        // FIXME: Move this logic to command
        // TODO: Better formatting
        let parsedScoreBoard = []
        for (const [key, value] of Object.entries(scoreBoard))
            parsedScoreBoard.push([value.username, value.wins]);
        parsedScoreBoard.sort((a, b) => {
            // Sort by votes
            // If the first item has a higher number, move it down
            // If the first item has a lower number, move it up
            if (a[1] < b[1]) return 1;
            if (a[1] > b[1]) return -1;

            // If the votes number is the same between both items, sort alphabetically
            // If the first item comes first in the alphabet, move it up
            // Otherwise move it down
            if (a[0] > b[0]) return 1;
            if (a[0] < b[0]) return -1;
        });
        for (let i = 0; i < parsedScoreBoard.length; i++) {
            if (i === 0)
                parsedScoreBoard[i] = `${parsedScoreBoard[i][1] ? `🥇 ` : ''}${parsedScoreBoard[i].join(': ')}\n`;
            else if (i === 1)
                parsedScoreBoard[i] = `${parsedScoreBoard[i][1] ? `🥈 ` : ''}${parsedScoreBoard[i].join(': ')}\n`;
            else if (i === 2)
                parsedScoreBoard[i] = `${parsedScoreBoard[i][1] ? `🥉 ` : ''}${parsedScoreBoard[i].join(': ')}\n`;
            else
                parsedScoreBoard[i] = `${parsedScoreBoard[i].join(': ')}\n`;
        }

        const res = `${winnerList.join('\n')}\n\n${parsedScoreBoard.join('')}`;
        return Promise.resolve(res);
    }
    catch (e) {
        return Promise.reject(e);
    }
}

/**
 * Generates a list with all the past winner's titles from a guild
 * To be used as prompt for the OpenAI recommendation function
 * @param {string} guildId The guild Id
 * @returns {Promise<string>} Array containing all winner's titles
*/
export async function generateOpenAIList(guildId) {
    try {
        /**
         * Maps results and gets the winner's title
         * @param {Partial<SNMWeek>} item 
        */
        const mapFunc = (item) => {
            const winnerUser = item.users.find(user => user.movies.find(movie => movie.titleKey === item.winner.titleKey));
            return `${item.week} - ${winnerUser.movies.find(movie => movie.titleKey === item.winner.titleKey).title}`;
        }

        const mongodb = await dbConnect();
        const winnerList = await mongodb.db(configObj.mongodbName)
            .collection(configObj.mongodbCollections[1])
            .find(
                {
                    guildId: guildId,
                    status: 'finished'
                },
                {
                    sort: { week: 1 },
                    projection: { winner: 1, users: 1, week: 1 }
                }
            )
            .map(mapFunc)
            .toArray();
        mongodb.close();

        const res = `${winnerList.join('\n')}`;
        return Promise.resolve(res);
    }
    catch (e) {
        return Promise.reject(e);
    }
}