import { Events } from 'discord.js';

export const ready = {
	name: Events.ClientReady,
	once: true,
	handler(client) {
		console.log(`Ready! Logged in as ${client.user.tag}\n`);
	},
};
