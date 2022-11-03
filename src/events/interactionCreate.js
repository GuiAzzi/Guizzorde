import { EmbedBuilder } from '@discordjs/builders';
import { Events, ChatInputCommandInteraction } from 'discord.js';
import {
	SNMWeekArray,
	SNMServerArray,
	upsertSNMWeek,
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
		catch (error) {
			console.error(error);
			if (!interaction.replied) {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			}
		}
	},
};

export const snmVoteInteractionCreate = {
	name: Events.InteractionCreate,
	once: false,
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async handler(interaction) {
		if (!interaction.isButton()) return;

		// Receiving a SNM Vote
		try {
			if (interaction.customId.startsWith('SNMVote')) {
				await interaction.deferReply({ ephemeral: true });

				const snmWeek = SNMWeekArray.get(interaction.guildId);
				const snmServer = SNMServerArray.get(interaction.guildId);
				const actionId = interaction.customId.replace('SNMVote - ', '');

				if (snmWeek.status !== 'voting') {
					console.log(`${interaction.user.username} - Voting has ended`);
					return interaction.editReply({ content: 'Voting has ended' });
				}

				// If helper show/clear vote buttons were clicked
				if (actionId === 'Show') {
					return snmVotesCommand.handler(interaction, 'show');
				}
				else if (actionId === 'Clear') {
					return snmVotesCommand.handler(interaction, 'clear');
				}

				let userObject = snmWeek.users.find(
					(userIndex) => userIndex.userId === interaction.user.id,
				);
				const movieTitleKey = snmWeek.emojisUsed.find(
					(emoji) => emoji.emoji === actionId,
				).titleKey;

				// user is not on the list yet
				if (!userObject) {
					const movieTitle = snmWeek.users
						.find((user) =>
							user.movies.find((movie) => movie.titleKey === movieTitleKey),
						)
						.movies.find((movie) => movie.titleKey === movieTitleKey).title;
					userObject =
						snmWeek.users[
							snmWeek.users.push({
								userId: interaction.user.id,
								username: interaction.user.username,
								movies: [],
								votes: [movieTitleKey],
							}) - 1
						];
					await upsertSNMWeek(snmWeek);
					const voteGuild = interaction.client.guilds.cache.get(
						snmServer.guildId,
					);
					const voteEmbed = new EmbedBuilder()
						.setTitle('Vote Confirmed ✅')
						.setDescription(`${movieTitle}`)
						.setFooter({
							text: `${voteGuild.name} | SNM ${snmWeek.week}`,
							iconURL: voteGuild.iconURL(),
						})
						.setColor(0x3498db)
						.setTimestamp(new Date());
					await interaction.user.send({ embeds: [voteEmbed] });
					interaction.editReply({
						content: 'Vote received, a log was sent to your DM',
					});
					console.log(
						`Added user ${interaction.user.username} with their vote`,
					);
				}
				// user already voted on that movie
				else if (userObject.votes.includes(movieTitleKey)) {
					interaction.editReply({
						content: 'You already voted on that movie.',
					});
					console.log(`${interaction.user.username} - Duplicate vote`);
				}
				// valid vote
				else if (userObject.votes.length < snmServer.maxVotes) {
					const movieTitle = snmWeek.users
						.find((user) =>
							user.movies.find((movie) => movie.titleKey === movieTitleKey),
						)
						.movies.find((movie) => movie.titleKey === movieTitleKey).title;
					userObject.votes.push(movieTitleKey);
					await upsertSNMWeek(snmWeek);
					const voteGuild = interaction.client.guilds.cache.get(
						snmServer.guildId,
					);
					const voteEmbed = new EmbedBuilder()
						.setTitle('Vote Confirmed ✅')
						.setDescription(`${movieTitle}`)
						.setFooter({
							text: `${voteGuild.name} | SNM ${snmWeek.week}`,
							iconURL: voteGuild.iconURL(),
						})
						.setColor(0x3498db)
						.setTimestamp(new Date());
					await interaction.user.send({ embeds: [voteEmbed] });
					interaction.editReply({
						content: 'Vote received, a log was sent to your DM',
					});
					console.log(
						`${interaction.user.username} voted. ${userObject.votes.length}/${snmServer.maxVotes}`,
					);
				}
				// no votes left
				else {
					interaction.editReply({
						content:
							'You have no votes left.\n`/snmVotes clear` to clear your votes.',
					});
					console.log(`${interaction.user.username} - No votes left`);
				}
			}
		}
		catch (e) {
			reportError(e);
		}
	},
};
