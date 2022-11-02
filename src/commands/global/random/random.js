import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const randomCommand = {
	data: new SlashCommandBuilder()
		.setName('random')
		.setDescription('Pick from one of the options randomly')
		.addStringOption((option) =>
			option
				.setName('options')
				.setDescription(
					'Comma separated options. "option1, options2, option3, ..."',
				)
				.setRequired(true),
		),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		const options = interaction.options.getString('options');

		// TODO: Append 1), 2), 3) at the star of each option?
		const commaArgs = options.split(/,+/g);
		const winner = Math.floor(Math.random() * commaArgs.length);
		const embedColors = [
			0xff0000, 0x00ff00, 0x0000ff, 0x808080, 0xffff00, 0x3498db,
		];
		const embedEmojis = ['🍀', '🤞', '🎲', '🎰', '🌠'];
		commaArgs[winner] = `\\> ${commaArgs[winner]} <`;
		return interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle(
						`${
							embedEmojis[Math.floor(Math.random() * embedEmojis.length)]
						} Random Picker ${
							embedEmojis[Math.floor(Math.random() * embedEmojis.length)]
						}`,
					)
					.setColor(embedColors[Math.floor(Math.random() * embedColors.length)])
					.setDescription(commaArgs.join('\n\n')),
			],
		});
	},
};
