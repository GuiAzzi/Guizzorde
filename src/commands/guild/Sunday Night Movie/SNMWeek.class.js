// In-memory SNMWeeks
/** @type {Map<string, SNMWeek>} */
export const SNMWeekArray = new Map();

/** A SNM Week */
export class SNMWeek {
  /** @param {SNMWeek} params */
  constructor(params) {
    /** @type {string} The server this SNM belongs to */
    this.guildId = params.guildId;
    /** @type {number} The SNM number */
    this.week = params.week;
    /** @type {"ongoing"|"voting"|"finished"} The SNM current status */
    this.status = params.status;
    /** @type {number} The number of movies in this SNM */
    this.movieCount = params.movieCount;
    /** @type {boolean} True if CRON schedule is paused */
    this.paused = params.paused;
    /** @type {[{userId: string, username: string, votes: Array, rating: string, movies: [{jwId: string?, title: string, titleKey: number, compactMovieEmbed: import("discord.js").APIEmbed}]}]} Array of user objects */
    this.users = params.users;
    /** @type {{titleKey: number, voteCount: number, userId: string}} Object containing the key of the winner title, its vote count and entry's userId */
    this.winner = params.winner;
    /** @type {{channelId: string, messageId: string}} Object containing the channel and vote message ID */
    this.voteMessage = params.voteMessage;
    /** @type {[Array]} Reference array of emojis used for voting */
    this.emojisUsed = params.emojisUsed;
  }
}
