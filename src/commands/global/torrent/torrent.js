import {
	SlashCommandBuilder,
	EmbedBuilder,
	ChatInputCommandInteraction,
} from 'discord.js';
import { reportError } from '../../../util/reportError.js';
import torrentSearch from 'torrent-search-api';

torrentSearch.enablePublicProviders();

export const torrentCommand = {
	data: new SlashCommandBuilder()
		.setName('torrent')
		.setDescription('Search for torrents on public trackers')
		.addStringOption((option) =>
			option
				.setName('query')
				.setDescription(
					'Your search text - Specifying a year usually helps - Movie Name (2019)',
				)
				.setRequired(true),
		),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		// Search for a torrent on a list of providers
		try {
			const query = interaction.options.getString('query');
			// Array containing command-specific tips
			const tips = [
				'You can use this command via DM!',
				'Specifying a year usually helps - Movie Name (2019)',
				'Looking for a movie? Try the /movie command',
			];

			// Sends to-be-edited message
			interaction.deferReply();

			// Searchs torrents
			await torrentSearch
				.search(['ThePirateBay', '1337x', 'Rarbg'], query, null, 3)
				.then(async (result) => {
					if (
						result.length === 0 ||
						result[0].title === 'No results returned'
					) {
						return await interaction.editReply({
							embeds: [
								new EmbedBuilder()
									.setTitle('Torrents Found: ')
									.setDescription('No torrent found 😔')
									.setColor(0x3498db),
							],
						});
					}
					else {
						const torrentList = [];
						for (const torrent of result) {
							torrentList.push(
								`\n\n[${torrent.title.replace(/\[|\]/g, '')}]( ${
									torrent.magnet
										? 'https://magnet.guiler.me?uri=' +
										encodeURIComponent(torrent.magnet)
										: torrent.desc
								} )\n${torrent.size} | ${torrent.seeds} seeders | ${
									torrent.provider
								}`,
							);
						}
						const torrentEmbed = new EmbedBuilder().setColor(0x3498db);

						// Check if message exceeds Discord's Max Characters (2048)
						const arr = torrentList.join('').match(/.{1,2048}$/gms);

						for (let i = 0; i < arr.length; i++) {
							// If first pass - embed with title
							if (i === 0) {
								if (interaction.guildId) {
									torrentEmbed.setFooter({
										text: `Tip: ${
											tips[Math.floor(Math.random() * tips.length)]
										}`,
									});
								}
								else {
									torrentEmbed.setFooter({ text: `Tip: ${tips[1]}` });
								}
								await interaction.editReply({
									embeds: [
										torrentEmbed
											.setTitle('Torrents Found: ')
											.setDescription(arr[i]),
									],
								});
							}
							// If torrents are too long -> Send followups with rest of data (pagination)
							else {
								return interaction.followUp({
									embeds: [torrentEmbed.setTitle(null).setDescription(arr[i])],
								});
							}
						}
					}
				});
		}
		catch (e) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle('Error')
						.setDescription('An error has occured. Please report this bug.')
						.setColor('Red'),
				],
			});
			reportError(e, interaction);
		}
	},
};
