export class SNMWeek {
    /**
     * A SNM Week
     * @param {string} guildId - The server this SNM belongs to
     * @param {number} week - The SNM number
     * @param {"ongoing"|"voting"|"finished"} status - The SNM current status
     * @param {number} movieCount - The number of movies in this SNM
     * @param {boolean} paused - True if CRON schedule is paused
     * @param {[{userId: string, username: string, votes: Array, movies: Array}]} users - Array of user objects
     * @param {{titleKey: number, voteCount: number}} winner - Object containing the key of the winner title and its vote count
     * @param {{channelId: string, messageId: string}} [voteMessage] - Object containing the channel and vote message ID
     * @param {Array} [emojisUsed] - Reference array of emojis used for vonting
     */

    /**
     * @param {SNMWeek} params 
     */
    constructor(params) {
        this.guildId = params.guildId;
        this.week = params.week;
        this.status = params.status;
        this.movieCount = params.movieCount;
        this.paused = params.paused
        this.users = params.users;
        this.winner = params.winner;
        this.voteMessage = params.voteMessage;
        this.emojisUsed = params.emojisUsed;
    };
}