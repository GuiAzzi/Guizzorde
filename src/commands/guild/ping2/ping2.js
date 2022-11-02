import { SlashCommandBuilder } from 'discord.js';
import { client } from '../../../config/index.js';

export const ping2 = {
	data: new SlashCommandBuilder()
		.setName('ping2')
		.setDescription('Show the bot\'s ping2'),
	handler: async function(interaction) {
		await interaction.reply(
			`Pong! API Latency is ${Math.round(client.ws.ping)}ms`,
		);
	},
};
