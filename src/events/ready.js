import { Events } from 'discord.js';
import { reportError } from '../util/index.js';
import { setReminders } from '../commands/global/remindMe/index.js';
import {
  SNMServerArray,
  getSNMServer,
  getSNMWeek,
} from '../commands/guild/Sunday Night Movie/index.js';

export const ready = {
  name: Events.ClientReady,
  once: true,
  async handler(client) {
    try {
      // Setups Reminders
      console.log('Setting up Reminders...');
      await setReminders();
      console.log('Finished setting up Reminders');

      // Gets SNMServer objects
      for (const guild of client.guilds.cache) {
        const server = await getSNMServer(guild[0]);
        // Register CronJob's
        if (server.schedule?.running) await server.toggleSchedule(true);
        else await server.toggleSchedule(false);
      }

      console.log('Fetching SNM files...');
      // Gets latest SNMWeek's
      for (const server of SNMServerArray) {
        await getSNMWeek(server[0]);
      }
      console.log('Got SNM files');

      client.user.setActivity('Beep boop');

      console.log(`Ready! Logged in as ${client.user.tag}\n`);
    }
    catch (e) {
      reportError(e);
    }
  },
};
