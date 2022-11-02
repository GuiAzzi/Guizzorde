import { Events } from 'discord.js';
import { reportError } from '../util/index.js';
import { setReminders } from '../commands/global/remindMe/index.js';

export const ready = {
	name: Events.ClientReady,
	once: true,
	async handler(client) {
		console.log(`Ready! Logged in as ${client.user.tag}\n`);

		try {
			// Setups Reminders
			await setReminders();
			console.log('Finished setting up Reminders');

			// // Gets SNMServer objects
			// for (const guild of client.guilds.cache) {
			// 	const server = await getSNMServer(guild[0]);
			// 	// Register CronJob's
			// 	if (server.schedule?.running) await server.toggleSchedule(true);
			// 	else await server.toggleSchedule(false);
			// }

			// // Gets latest SNMWeek's
			// for (const server of SNMServerArray) {
			// 	await getSNMWeek(server[0]);
			// }

			// console.log('Got SNM files');
		}
		catch (e) {
			reportError(e);
		}
	},
};
