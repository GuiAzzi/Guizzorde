import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
} from 'discord.js';

import {
	SNMWeek,
	getWinnersList,
	getSNMWeek,
} from '../../guild/Sunday Night Movie/index.js';
import { reportError } from '../../../util/index.js';

export const snmCommand = {
	data: new SlashCommandBuilder()
		.setName('snm')
		.setDescription('Show this week movies or specified week summary')
		.addIntegerOption((option) =>
			option.setName('week').setDescription('A SNM week number'),
		)
		.addBooleanOption((option) =>
			option
				.setName('silent')
				.setDescription('No message will be sent to the channel.'),
		)
		.setDMPermission(false),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		try {
			const week = interaction.options.getInteger('week');
			const silent = interaction.options.getBoolean('silent');
			const _export = interaction.options.getBoolean('export');

			const snmWeekEmbed = new EmbedBuilder()
				.setTitle('Searching...')
				.setColor(0x3498db);

			// Sends to-be-edited message
			await interaction.deferReply({ ephemeral: silent });

			// If week <= 0 gets list of winners
			if (week != null && week <= 0) {
				const arr = (await getWinnersList(interaction.guildId)).match(
					/.{1,2048}$/gms,
				);

				for (let i = 0; i < arr.length; i++) {
					if (i === 0) {
						await interaction.editReply({
							embeds: [
								snmWeekEmbed
									.setTitle('🥇 List of SNM Winners 🥇')
									.setDescription(arr[i]),
							],
						});
					}
					else {
						await interaction.editReply({
							embeds: [snmWeekEmbed.setTitle(null).setDescription(arr[i])],
						});
					}
				}
			}
			else {
				const snmWeek = await getSNMWeek(interaction.guildId, week);

				// Week doesn't exist
				if (!snmWeek.week) {
					await interaction.editReply({
						embeds: [
							snmWeekEmbed
								.setTitle('Error')
								.setDescription('No week found')
								.setColor('Red'),
						],
					});
				}
				else {
					for (const user of snmWeek.users) {
						for (const movie of user.movies) {
							movie.compactMovieEmbed = null;
						}
					}
					snmWeekEmbed
						.setTitle(`👨‍💻 Sunday Night Movie ${snmWeek.week} 👨‍💻`)
						.setDescription(
							`\`\`\`JSON\n${JSON.stringify(snmWeek, null, 2)}\`\`\``,
						);
					await interaction.editReply({
						embeds: [_export ? snmWeekEmbed : snmEmbed(snmWeek)],
					});
				}
			}
		}
		catch (e) {
			reportError(e, interaction);
		}
	},
};

/**
 * Creates a SNM Week Embed
 * @param {SNMWeek} snmWeek
 * @returns {EmbedBuilder} An SNM week embed
 */
function snmEmbed(snmWeek) {
	// If snm is finished
	if (snmWeek.status === 'finished') {
		const printArray = [];
		let tempMovies = [];

		// runs through week and get movies, winner and ratings
		let description = `Status: **${
			snmWeek.paused ? 'paused' : snmWeek.status
		}**\n`;
		for (const userIndex in snmWeek.users) {
			// If user only voted - no entries or ratings = skip user on summary
			if (
				!snmWeek.users[userIndex].movies.length > 0 &&
				!snmWeek.users[userIndex].rating
			) {
				continue;
			}
			printArray[userIndex] = `**${snmWeek.users[userIndex].username}**\n`;
			// checks if user has movies and add it to printArray in the position of title key (to print in order in the end)
			if (snmWeek.users[userIndex].movies) {
				for (const movieIndex in snmWeek.users[userIndex].movies) {
					// if movie is the winner, add to description text
					delete snmWeek.users[userIndex].movies[movieIndex].compactMovieEmbed;
					if (
						snmWeek.users[userIndex].movies[movieIndex].titleKey ===
						snmWeek.winner.titleKey
					) {
						description += `Winner: **${
							snmWeek.users[userIndex].movies[movieIndex].title
						}**${
							snmWeek.winner.voteCount
								? ` | ${snmWeek.winner.voteCount} votes`
								: ''
						}\n\n`;
					}
					tempMovies.push(
						`\`${snmWeek.users[userIndex].movies[movieIndex].title}\``,
					);
				}
			}
			printArray[userIndex] += `${
				tempMovies.length > 0 ? `- Entries: ${tempMovies.join(' | ')}\n` : ''
			}${
				snmWeek.users[userIndex].rating
					? `- Rating: ${snmWeek.users[userIndex].rating}\n\n`
					: '\n'
			}`;
			tempMovies = [];
		}

		return (
			new EmbedBuilder()
				// Set the title of the field
				.setTitle(`📖 Summary of Sunday Night Movie ${snmWeek.week} 📖`)
				// Set the color of the embed
				.setColor(0x3498db)
				// Set the main content of the embed
				.setDescription(description + printArray.join(''))
		);
	}
	// If snm not finished
	else {
		const description = `Status: **${
			snmWeek.paused ? 'paused' : snmWeek.status
		}**\n\n`;
		/** @type {import('@discordjs/builders').EmbedFooterData} */
		let footer = '';
		const printArray = [];

		// If status is finished, prints winner;
		// if (snmWeek.status === "finished" && snmWeek.winner.titleKey)
		//     description += `Winner: **${snmWeek.users.find(user => user.movies.find(movie => movie.titleKey === snmWeek.winner.titleKey)).movies.find(movie => movie.titleKey === snmWeek.winner.titleKey).title}**\n\n`;

		// Builds list ordered by titleKey
		for (const userIndex in snmWeek.users) {
			for (const movieIndex in snmWeek.users[userIndex].movies) {
				printArray[snmWeek.users[userIndex].movies[movieIndex].titleKey - 1] = [
					`${snmWeek.users[userIndex].movies[movieIndex].titleKey}) ${snmWeek.users[userIndex].movies[movieIndex].title}\n`,
				];
			}
		}

		if (printArray.length === 0) {
			printArray.push('No movies requested yet 😢\n');
		}

		if (snmWeek.status === 'ongoing') {
			footer = { text: '/snmTitle add to enter a movie' };
		}
		else if (snmWeek.status === 'finished') {
			footer = { text: '/snmRate to leave a rating' };
		}
		else if (snmWeek.status === 'voting') {
			footer = { text: 'Go vote 🔥\n/snmVotes start' };
		}

		return (
			new EmbedBuilder()
				// Set the title of the field
				.setTitle(`🌟 Sunday Night Movie ${snmWeek.week} 🌟`)
				// Set the color of the embed
				.setColor(0x3498db)
				// Set the main content of the embed
				.setDescription(description + printArray.join(''))
				// Set the footer text
				.setFooter(footer)
		);
	}
}
