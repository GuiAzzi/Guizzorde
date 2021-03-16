export default class SNMWeek {
    /**
     * 
     * @param {string} guildId - The server this SNM belongs to
     * @param {number} week - The SNM number
     * @param {"ongoing"|"voting"|"finished"} status - The SNM current status
     * @param {number} movieCount - The number of movies in this SNM
     * @param {boolean} paused - True if CRON schedule is paused
     * @param {[{userId: string, username: string, votes: Array, movies: Array}]} [users] - Array of user objects
     * @param {{titleKey: number, voteCount: number}} [winner] - Object containing the key of the winner title and its vote count
     * @param {{channelId: string, messageId: string}} [voteMessage] - Object containing the channel and vote message ID
     * @param {Array} [emojiUsed] - Reference array of emojis used for vonting
     */
    constructor(guildId, week, status, movieCount, paused, users, winner, voteMessage, emojiUsed) {
        this.guildId = guildId;
        this.week = week;
        this.status = status;
        this.movieCount = movieCount;
        this.paused = paused
        this.users = users;
        this.winner = winner;
        this.voteMessage = voteMessage;
        this.emojiUsed = emojiUsed;
    };
}