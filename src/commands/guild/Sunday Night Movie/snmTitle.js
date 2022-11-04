import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import {
	getSNMServer,
	getSNMWeek,
	upsertSNMWeek,
} from '../../guild/Sunday Night Movie/index.js';
import { generateCompactMovieEmbed } from '../../global/movie/movie.js';
import { reportError } from '../../../util/index.js';

export const snmTitleCommand = {
	data: new SlashCommandBuilder()
		.setName('snmtitle')
		.setDescription('Add or remove SNM entries')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setDescription('Add a movie to current SNM')
				.addStringOption((option) =>
					option
						.setName('title')
						.setDescription('The movie title')
						.setRequired(true),
				)
				.addBooleanOption((option) =>
					option
						.setName('silent')
						.setDescription('No message will be sent to the channel.'),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('remove')
				.setDescription('Remove a movie from current SNM')
				.addStringOption((option) =>
					option
						.setName('title')
						.setDescription('The movie title or SNM number')
						.setRequired(true),
				)
				.addBooleanOption((option) =>
					option
						.setName('silent')
						.setDescription('No message will be sent to the channel.'),
				),
		)
		.setDMPermission(false),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		try {
			const interactionOptions = interaction.options.getSubcommand();
			const titleName = interaction.options.getString('title');
			const silent = interaction.options.getBoolean('silent');

			await interaction.deferReply({ ephemeral: silent });

			const snmServer = await getSNMServer(interaction.guildId);
			const lastSNM = await getSNMWeek(interaction.guildId);

			if (!lastSNM.week) {
				return await interaction.editReply('No week to interact with');
			}

			switch (interactionOptions) {
			case 'add': {
				// If week is no longer "ongoing"
				if (lastSNM.status != 'ongoing') {
					return await interaction.editReply(
						`Can't modify \`Sunday Night Movie ${lastSNM.week}\` as it is \`${lastSNM.status}\``,
					);
				}

				const authorId = interaction.member.user.id;
				// Checks if user is already on the list
				let userObject = lastSNM.users.find(
					(user) => user.userId === authorId,
				);

				if (userObject) {
					// Check user entries
					if (userObject.movies.length === snmServer.maxEntries) {
						return await interaction.editReply(
							'You have no entries left.\nRemove entries with `/snmTitle remove`.',
						);
					}
				}
				// Add user to the list and update userObject
				else {
					userObject =
							lastSNM.users[
								lastSNM.users.push({
									userId: authorId,
									username: interaction.member.user.username,
									movies: [],
									votes: [],
								}) - 1
							];
				}

				// If movie is already on the list, cancel and inform user
				if (
					lastSNM.users.find((user) =>
						user.movies.find((movie) => movie.title === titleName),
					)
				) {
					return await interaction.editReply(
						'This title is already on the list!',
					);
				}

				// Adds movie to the list
				lastSNM.movieCount++;
				userObject.movies.push({
					title: titleName,
					titleKey: lastSNM.movieCount,
				});

				try {
					// Followup with /movie
					if (!silent) {
						const compactMovieEmbed = await generateCompactMovieEmbed(
							titleName,
							snmServer.locale || 'en',
						);
						compactMovieEmbed
							.setAuthor({
								name: interaction.member.user.username,
								iconURL:
										`https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}` ||
										'https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png',
							})
							.setFooter({ text: `SNM ${lastSNM.week}` });
						if (compactMovieEmbed) {
							await interaction.editReply({
								embeds: [compactMovieEmbed],
							});

							userObject.movies[
								userObject.movies.length - 1
							].compactMovieEmbed = compactMovieEmbed.toJSON();
						}
					}
				}
				catch (e) {
					console.log(
						`Failed to generate compactMovieEmbed for the new entry "${titleName}" from "${interaction.user.username}" at "${interaction.guild.name}:${interaction.guildId}"`,
					);
				}
				await upsertSNMWeek(lastSNM);
				return await interaction.editReply(
					`Added \`${titleName}\` to the list`,
				);
			}
			case 'remove': {
				// If week is no longer "ongoing"
				if (lastSNM.status != 'ongoing') {
					return await interaction.editReply(
						`Can't modify \`Sunday Night Movie ${lastSNM.week}\` as it is \`${lastSNM.status}\``,
					);
				}

				// Removes a movie from the list
				let stringFound;
				let numberFound;
				let checkNumber;
				let deleted;

				// Prioritize strings over numbers, as they are more specific.
				// Movie can be "007" which would be a string and not position 7.
				// If message is a number, we will save the titleKey that matches it. In case we don't find a string.
				if (Number(titleName)) checkNumber = true;

				// Checks if there is a movie with the same name as the message string
				for (const userIndex in lastSNM.users) {
					for (const movieIndex in lastSNM.users[userIndex].movies) {
						if (
							lastSNM.users[userIndex].movies[movieIndex].title === titleName
						) {
							stringFound = true;
							// Checks if movie found was submitted by message author
							if (
								lastSNM.users[userIndex].userId === interaction.member.user.id
							) {
								deleted = lastSNM.users[userIndex].movies.splice(
									movieIndex,
									1,
								);
							}
							else {
								return await interaction.editReply(
									'This is not your movie 😒',
								);
							}
							break;
						}
						// If checkNumber is true and we didn't find a string yet. Check if titleKey matches user message.
						// If it does, save indexes
						else if (checkNumber) {
							if (
								Number(titleName) ===
									lastSNM.users[userIndex].movies[movieIndex].titleKey
							) {
								numberFound = [userIndex, movieIndex];
							}
						}
					}
				}

				// If we didn't find a string but found a matching titleKey, try to delete
				if (numberFound && !stringFound) {
					// Checks if movie found was submitted by message author
					if (
						lastSNM.users[numberFound[0]].userId ===
							interaction.member.user.id
					) {
						deleted = lastSNM.users[numberFound[0]].movies.splice(
							numberFound[1],
							1,
						);
					}
					else {
						return await interaction.editReply('This is not your movie 😒');
					}
				}

				// Fixes titleKeys and movieCount
				if (deleted) {
					deleted = deleted[0];
					lastSNM.movieCount--;
					for (const userIndex in lastSNM.users) {
						for (const movieIndex in lastSNM.users[userIndex].movies) {
							if (
								lastSNM.users[userIndex].movies[movieIndex].titleKey >
									deleted.titleKey
							) {
								lastSNM.users[userIndex].movies[movieIndex].titleKey--;
							}
						}
					}

					await upsertSNMWeek(lastSNM);
					return await interaction.editReply(
						`Removed \`${deleted.title}\` from the list`,
					);
				}
				else {
					return await interaction.editReply(
						'Movie not found.\n`/snm` to see the list',
					);
				}
			}
			}
		}
		catch (e) {
			reportError(e, interaction);
		}
	},
};
