import { SlashCommandBuilder } from 'discord.js';
import { client } from '../../../config/index.js';

export const ping = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Show the bot\'s ping'),
	handler: async function(interaction) {
		await interaction.reply(
			`Pong! API Latency is ${Math.round(client.ws.ping)}ms`,
		);
	},
};
