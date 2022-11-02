import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
} from 'discord.js';
import { randomEmoji } from '../../../util/random-emoji.js';

export const pollCommand = {
	data: new SlashCommandBuilder()
		.setName('poll')
		.setDescription('Start a poll that people can vote on')
		.addStringOption((option) =>
			option
				.setName('title')
				.setDescription('What\'s the poll about?')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('options')
				.setDescription(
					'Comma separated options. "Apple, Orange, Pineapple, ..."',
				)
				.setRequired(true),
		),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		// Get options
		const pollTitle = interaction.options.getString('title');
		const pollOptions = interaction.options.getString('options').split(/,+/g);

		const msg = await interaction.deferReply({ fetchReply: true });

		// Get server custom emojis
		const serverEmojis = interaction.client.guilds.cache.get(
			interaction.guildId,
		)?.emojis.cache || { size: 0 };

		// Each arg will be assigned an emoji. Chosen emojis will be stored here.
		const pickedEmojis = [];

		for (let i = 0; i < pollOptions.length; i++) {
			if (serverEmojis.size !== 0) {
				const rndEmoji = serverEmojis.random();
				pickedEmojis.push(rndEmoji);
				serverEmojis.delete(rndEmoji.id);
				pollOptions[
					i
				] = `<:${pickedEmojis[i].name}:${pickedEmojis[i].id}> - ${pollOptions[i]}`;
			}
			else {
				let rndEmoji = randomEmoji();
				while (pickedEmojis.includes(rndEmoji)) rndEmoji = randomEmoji();
				pickedEmojis.push(rndEmoji);
				pollOptions[i] = `${pickedEmojis[i]} - ${pollOptions[i]}`;
			}
		}

		// Sends poll embed
		await interaction.editReply({
			content: 'Poll starting!',
			embeds: [
				new EmbedBuilder()
					.setTitle(pollTitle)
					.setColor(0x3498db)
					.setDescription(pollOptions.join('\n\n'))
					.setFooter({ text: 'Vote by clicking the corresponding emoji' }),
			],
		});

		// Reacts to embed accordingly
		for (let i = 0; i < pollOptions.length; i++) {
			await msg.react(pickedEmojis[i]);
		}
	},
};
