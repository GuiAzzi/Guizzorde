export class SNMServer {
    /**
     * SNM Settings for a Server
     * @param {string} guildId - The Server ID
     * @param {boolean} enabled - If SNM is enabled for this Server
     * @param {string} defaultChannel - The channel where SNM announcements should default to being sent
     * @param {number} maxEntries - How many titles a user can enter
     * @param {number} maxVotes - How many votes a user can have
     * @param {{running: boolean, new: string, start: string, end: string}} schedule - If SNM should be automated
     */

    /**
     * @param {SNMServer} params
     */
    constructor(params) {
        this.guildId = params.guildId;
        this.enabled = params.enabled;
        this.defaultChannel = params.defaultChannel;
        this.maxEntries = params.maxEntries;
        this.maxVotes = params.maxVotes;
        this.schedule = params.schedule;
    }
}