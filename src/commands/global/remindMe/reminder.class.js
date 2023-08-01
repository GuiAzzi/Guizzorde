// eslint-disable-next-line no-unused-vars
import { CronJob } from 'cron';

// In-Memory Reminders
/** @type {{nextReminder: GuizzordeReminder, lastReminder: GuizzordeReminder, reminderJob: CronJob|null idList: Map<string, number>} */
export const Reminders = {
  // can't "await get...()" on these
  // "client" is not yet logged in so if some action is issued at this time it will crash
  idList: null,
  nextReminder: null,
  lastReminder: null,
  reminderJob: null,
};

export class GuizzordeReminder {
  /**
	 * @param {GuizzordeReminder} params
	 */
  constructor(params) {
    /** @type {number} The Reminder's ID - Incremental number */
    this.reminderId = params.reminderId;
    /** @type {string} The Owner's ID - User who created this reminder */
    this.ownerId = params.ownerId;
    /** @type {{channelId: string, messageId: string}}} The Reminder's Message's ID - For editing later */
    this.message = params.message;
    /** @type {[{userId: string, username: string}]} Array of users to be reminded */
    this.users = params.users;
    /** @type {string} The Reminder's text */
    this.text = params.text;
    /** @type {number} The Reminder's due date in UNIX time */
    this.date = params.date;
    /** @type {boolean} Whether the Reminder has been fired or not */
    this.fired = params.fired;
    /** @type {boolean} Whether the Reminder is private or not */
    this.private = params.private;
  }
}
