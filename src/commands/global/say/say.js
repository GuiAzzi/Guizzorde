import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const sayCommand = {
	data: new SlashCommandBuilder()
		.setName('say')
		.setDescription('Make the bot say something')
		.addStringOption((option) =>
			option
				.setName('message')
				.setDescription('The message you want the bot to say')
				.setRequired(true),
		),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		const message = interaction.options.getString('message');
		await interaction.reply(message);
	},
};
