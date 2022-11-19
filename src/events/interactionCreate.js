import { EmbedBuilder } from '@discordjs/builders';
import {
	Events,
	ChatInputCommandInteraction,
	ButtonInteraction,
	SelectMenuInteraction,
} from 'discord.js';
import {
	upsertSNMWeek,
	getSNMWeek,
	getSNMServer,
	generateVotingComponents,
} from '../commands/guild/Sunday Night Movie/index.js';
import { snmVotesCommand } from '../commands/guild/Sunday Night Movie/index.js';
import { reportError } from '../util/index.js';

export const interactionCreate = {
	name: Events.InteractionCreate,
	once: false,
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async handler(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(
				`No command matching ${interaction.commandName} was found.`,
			);
			return;
		}

		try {
			console.log(
				`${interaction.user.username} executing "${interaction.commandName}"${
					interaction.options.data.length
						? ` with "${JSON.stringify(interaction.options.data)}"`
						: ''
				}${
					interaction.inGuild()
						? ` in "${interaction.guild.name}":${interaction.guildId}`
						: ' via DM'
				}`,
			);
			console.log(`"${interaction.commandName}" starting...`);
			await command.handler(interaction);
			console.log(`"${interaction.commandName}" finished.\n`);
		}
		catch (e) {
			reportError(e, interaction);
		}
	},
};

export const snmVoteInteractionCreate = {
	name: Events.InteractionCreate,
	once: false,
	/**
	 * @param {ButtonInteraction|SelectMenuInteraction} interaction
	 */
	async handler(interaction) {
		if (!interaction.isButton() && !interaction.isSelectMenu()) return;

		// SNM related
		try {
			if (interaction.customId.startsWith('SNM')) {
				// Interaction from VOTE MESSAGE (scheduler or /snmAdmin start)
				if (interaction.customId.startsWith('SNMVoteMessage')) {
					interaction.deferReply({ ephemeral: true });

					const actionId = interaction.customId.split('- ')[1];
					const lastSNM = await getSNMWeek(interaction.guildId);

					if (!lastSNM) {
						console.log(
							`${interaction.user.username} tried to manage vote while lastSNM is undefined at ${interaction.guild.name}:${interaction.guildId}`,
						);
						return await interaction.editReply({
							content: `Can't execute function because period is \`${lastSNM.status}\``,
						});
					}
					else if (lastSNM.status !== 'voting') {
						console.log(
							`${interaction.user.username} tried to manage vote while period is ${lastSNM.status}`,
						);
						return await interaction.editReply({
							content: `Can't execute function because period is \`${lastSNM.status}\``,
						});
					}

					// If helper show/clear vote buttons were clicked
					if (actionId === 'Start') {
						return snmVotesCommand.handler(interaction, 'start');
					}
					else if (actionId === 'Show') {
						return snmVotesCommand.handler(interaction, 'show');
					}
					else if (actionId === 'Clear') {
						return snmVotesCommand.handler(interaction, 'clear');
					}
				}
				// Interaction from VOTE SYSTEM (Start Voting or /snmVotes start)
				else if (interaction.customId.startsWith('SNMVoteSystem')) {
					interaction.deferUpdate();

					const actionId = interaction.customId.split(' ')[0];
					const lastSNM = await getSNMWeek(interaction.guildId);
					const snmServer = await getSNMServer(interaction.guildId);

					if (!lastSNM) {
						console.log(
							`${interaction.user.username} tried to manage vote while lastSNM is undefined at ${interaction.guild.name}:${interaction.guildId}`,
						);
						return await interaction.editReply({
							content: `Can't execute function because period is \`${lastSNM.status}\``,
							components: [],
							embeds: [],
						});
					}
					else if (lastSNM.status !== 'voting') {
						console.log(
							`${interaction.user.username} tried to manage vote while period is ${lastSNM.status}`,
						);
						return await interaction.editReply({
							content: `Can't execute function because period is \`${lastSNM.status}\``,
							components: [],
							embeds: [],
						});
					}

					// If user is navigating through movies on the voting system
					if (
						actionId === 'SNMVoteSystemPrev' ||
						actionId === 'SNMVoteSystemNext'
					) {
						const selectedTitleKey = interaction.customId.split('- ')[1];

						await interaction.editReply({
							embeds: [
								lastSNM.users
									.find((u) =>
										u.movies.find((m) => m.titleKey == selectedTitleKey),
									)
									.movies.find((m) => m.titleKey == selectedTitleKey)
									.compactMovieEmbed,
							],
							components: generateVotingComponents(
								interaction,
								lastSNM,
								snmServer,
								Number(selectedTitleKey),
							),
							content: null,
						});
					}
					// User selected a movie with the select menu
					else if (actionId === 'SNMVoteSystemMenu') {
						const selectedTitleKey = interaction.values[0];

						await interaction.editReply({
							embeds: [
								lastSNM.users
									.find((u) =>
										u.movies.find((m) => m.titleKey == selectedTitleKey),
									)
									.movies.find((m) => m.titleKey == selectedTitleKey)
									.compactMovieEmbed,
							],
							components: generateVotingComponents(
								interaction,
								lastSNM,
								snmServer,
								Number(selectedTitleKey),
							),
							content: null,
						});
					}
					// User clicked Clear inside Vote System
					else if (actionId === 'SNMVoteSystemClear') {
						return snmVotesCommand.handler(interaction, 'clear', true);
					}
					// Receiving a SNM Vote
					else if (actionId === 'SNMVoteSystemVoting') {
						let userObject = lastSNM.users.find(
							(userIndex) => userIndex.userId === interaction.user.id,
						);
						const movieTitleKey = Number(interaction.customId.split('- ')[1]);

						// user is not on the list yet
						if (!userObject) {
							userObject =
								lastSNM.users[
									lastSNM.users.push({
										userId: interaction.user.id,
										username: interaction.user.username,
										movies: [],
										votes: [],
									}) - 1
								];
							console.log(
								`Created new entry for user ${interaction.user.username}`,
							);
						}
						// user already voted on the movie
						else if (userObject.votes.includes(movieTitleKey)) {
							console.log(`${interaction.user.username} - Duplicate vote`);
							return await interaction.editReply({
								components: generateVotingComponents(
									interaction,
									lastSNM,
									snmServer,
									movieTitleKey,
									'You already voted on that movie.',
								),
							});
						}
						// save vote
						if (userObject.votes.length < snmServer.maxVotes) {
							const movieTitle = lastSNM.users
								.find((user) =>
									user.movies.find((movie) => movie.titleKey === movieTitleKey),
								)
								.movies.find((movie) => movie.titleKey === movieTitleKey).title;
							userObject.votes.push(movieTitleKey);
							await upsertSNMWeek(lastSNM);
							const voteGuild = interaction.client.guilds.cache.get(
								snmServer.guildId,
							);
							const voteEmbed = new EmbedBuilder()
								.setTitle('Vote Confirmed ✅')
								.setDescription(`${movieTitle}`)
								.setFooter({
									text: `${voteGuild.name} | SNM ${lastSNM.week}`,
									iconURL: voteGuild.iconURL(),
								})
								.setColor(0x3498db)
								.setTimestamp(new Date());
							await interaction.user.send({ embeds: [voteEmbed] });
							await interaction.editReply({
								components: generateVotingComponents(
									interaction,
									lastSNM,
									snmServer,
									movieTitleKey,
									'Vote received, a log was sent to your DM',
								),
							});
							console.log(
								`${interaction.user.username} voted. ${userObject.votes.length}/${snmServer.maxVotes}`,
							);
						}
						// no votes left
						else {
							await interaction.editReply({
								components: generateVotingComponents(
									interaction,
									lastSNM,
									snmServer,
									movieTitleKey,
									'You have no votes left.',
								),
							});
							console.log(`${interaction.user.username} - No votes left`);
						}
					}
				}
			}
		}
		catch (e) {
			reportError(e, interaction);
		}
	},
};
