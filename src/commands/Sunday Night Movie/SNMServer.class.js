import cron, { CronJob } from 'cron';
import { CommandInteraction } from 'discord.js';

import { client } from '../../config/index.js';
import { reportError } from '../../util/index.js';
import { snmCommands } from './index.js';

// In-memory SNMServers
/** @type {Map<string, SNMServer>} */
export const SNMServerArray = new Map();

// In-memory schedules
/** @type {Map<string, {cronNew: CronJob, cronStart: CronJob, cronEnd: CronJob}>} */
export const SNMSchedulesArray = new Map();

/** SNM Settings for a Server */
export class SNMServer {

    /**
     * @param {SNMServer} params
     */
    constructor(params) {
        /** @type {string} guildId - The Server ID */
        this.guildId = params.guildId;
        /** @type {boolean} enabled - If SNM is enabled for this Server */
        this.enabled = params.enabled;
        /** @type {string} defaultChannel - The channel where SNM announcements should default to being sent */
        this.defaultChannel = params.defaultChannel;
        /** @type {number} maxEntries - How many titles a user can enter */
        this.maxEntries = params.maxEntries;
        /** @type {number} maxVotes - How many votes a user can have */
        this.maxVotes = params.maxVotes;
        /** @type {{running: boolean, new: string, start: string, end: string}} schedule - If SNM should be automated */
        this.schedule = params.schedule;
    }

    /**
     * Toggles this server schedule
     * @param {boolean} running - If cron should be active or not
     */
    async toggleSchedule(running) {
        try {
            // if running true
            if (running) {
                const snmSchedule = SNMSchedulesArray.get(this.guildId);
                // if Schedule already exist
                if (snmSchedule) {
                    snmSchedule.cronNew.running ? null : snmSchedule.cronNew.start();
                    snmSchedule.cronStart.running ? null : snmSchedule.cronStart.start();
                    snmSchedule.cronEnd.running ? null : snmSchedule.cronEnd.start();
                }
                else {
                    // new Schedule
                    SNMSchedulesArray.set(this.guildId, {
                        cronNew: new cron.CronJob(
                            this.schedule.new,
                            async () => {
                                await snmCommands.snmAdmin.handler(
                                    new CommandInteraction(client, {
                                        guild_id: this.guildId,
                                        channel_id: SNMServerArray.get(this.guildId).defaultChannel,
                                        user: client.user,
                                        member: {
                                            user: client.user,
                                        },
                                        data: {
                                            name: 'snmadmin',
                                            options: [{ value: 'new', name: 'command', type: '3' }],
                                        }
                                    }), true)
                            },
                            null,
                            true,
                            // TODO: Update to SNMServer.timeZone when implemented
                            'America/Sao_Paulo'
                        ),
                        cronStart: new cron.CronJob(
                            this.schedule.start,
                            async () => {
                                await snmCommands.snmAdmin.handler(
                                    new CommandInteraction(client, {
                                        guild_id: this.guildId,
                                        channel_id: SNMServerArray.get(this.guildId).defaultChannel,
                                        user: client.user,
                                        member: {
                                            user: client.user
                                        },
                                        data: {
                                            name: 'snmadmin',
                                            options: [{ value: 'start', name: 'command', type: '3' }],
                                        }
                                    }), true)
                            },
                            null,
                            true,
                            'America/Sao_Paulo'
                        ),
                        cronEnd: new cron.CronJob(
                            this.schedule.end,
                            async () => {
                                await snmCommands.snmAdmin.handler(
                                    new CommandInteraction(client, {
                                        guild_id: this.guildId,
                                        channel_id: SNMServerArray.get(this.guildId).defaultChannel,
                                        user: client.user,
                                        member: {
                                            user: client.user
                                        },
                                        data: {
                                            name: 'snmadmin',
                                            options: [{ value: 'end', name: 'command', type: '3' }],
                                        }
                                    }), true)
                            },
                            null,
                            true,
                            'America/Sao_Paulo'
                        )
                    })
                }
            }
            else if (running === false) {
                SNMSchedulesArray.get(this.guildId)?.cronNew.stop();
                SNMSchedulesArray.get(this.guildId)?.cronStart.stop();
                SNMSchedulesArray.get(this.guildId)?.cronEnd.stop();
            }
        }
        catch (e) {
            reportError(e)
        }
    }
}