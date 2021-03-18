import cron, { CronJob } from 'cron';

import { client } from '../../config/index.js';
import { reportError } from '../../util/index.js';
import { SNMObj } from './index.js';

// In-memory SNMServers
/**
 * @type {Map<string, SNMServer>}
 */
export const SNMServerArray = new Map();

// In-memory schedules
/**
 * @type {Map<string, {cronNew: CronJob, cronStart: CronJob, cronEnd: CronJob}>}
 */
export const SNMSchedulesArray = new Map();

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
                                await SNMObj.snmAdmin.handler({
                                    fromScheduler: true,
                                    guild_id: this.guildId,
                                    // get defaultChannel from SNMServerArray because it keeps the reference, if changed later
                                    channel_id: SNMServerArray.get(this.guildId).defaultChannel,
                                    member: {
                                        user: {
                                            id: client.user.id,
                                            username: client.user.username
                                        }
                                    },
                                    data: {
                                        name: 'snmadmin',
                                        options: [{ value: 'new', name: 'command' }],
                                    }
                                })
                            },
                            null,
                            true,
                            'America/Sao_Paulo'
                        ),
                        cronStart: new cron.CronJob(
                            this.schedule.start,
                            async () => {
                                await SNMObj.snmAdmin.handler({
                                    fromScheduler: true,
                                    guild_id: this.guildId,
                                    channel_id: SNMServerArray.get(this.guildId).defaultChannel,
                                    member: {
                                        user: {
                                            id: client.user.id,
                                            username: client.user.username
                                        }
                                    },
                                    data: {
                                        name: 'snmadmin',
                                        options: [{ value: 'start', name: 'command' }],
                                    }
                                })
                            },
                            null,
                            true,
                            'America/Sao_Paulo'
                        ),
                        cronEnd: new cron.CronJob(
                            this.schedule.end,
                            async () => {
                                await SNMObj.snmAdmin.handler({
                                    fromScheduler: true,
                                    guild_id: this.guildId,
                                    channel_id: SNMServerArray.get(this.guildId).defaultChannel,
                                    member: {
                                        user: {
                                            id: client.user.id,
                                            username: client.user.username
                                        }
                                    },
                                    data: {
                                        name: 'snmadmin',
                                        options: [{ value: 'end', name: 'command' }],
                                    }
                                })
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