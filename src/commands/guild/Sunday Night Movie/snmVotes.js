import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	SelectMenuBuilder,
	ButtonInteraction,
	SelectMenuInteraction,
} from 'discord.js';

import {
	getSNMWeek,
	getSNMServer,
	upsertSNMWeek,
	SNMWeek,
	SNMServer,
} from '../../guild/Sunday Night Movie/index.js';
import { reportError } from '../../../util/index.js';

/**
 * @param {ButtonInteraction|SelectMenuInteraction} interaction
 * @param {SNMWeek} lastSNM
 * @param {SNMServer} snmServer
 * @param {number} selectedMovie
 */
export const generateVotingComponents = (
	interaction,
	lastSNM,
	snmServer,
	selectedMovie = 1,
	message,
) => {
	const userFound = lastSNM.users.find((u) => u.userId === interaction.user.id);
	let remainingVotes;
	if (userFound) remainingVotes = snmServer.maxVotes - userFound.votes.length;
	else remainingVotes = snmServer.maxVotes;

	const movies = lastSNM.users.map((user) => user.movies).flat();

	const selectMenu = new SelectMenuBuilder()
		.setCustomId('SNMVoteSystemMenu')
		.setPlaceholder('Select a movie here');
	for (const movie of movies) {
		selectMenu.addOptions({
			label: movie.title,
			value: movie.titleKey.toString(),
			emoji: lastSNM.emojisUsed[movie.titleKey - 1].emoji,
			description: lastSNM.users.find((u) => u.movies.includes(movie)).username,
			default: movie.titleKey === selectedMovie ? true : false,
		});
	}

	const actionRows = [
		new ActionRowBuilder().addComponents([selectMenu]),
		new ActionRowBuilder().addComponents([
			new ButtonBuilder()
				.setCustomId(`SNMVoteSystemPrev - ${selectedMovie - 1}`)
				.setEmoji('◀️')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(selectedMovie - 1 <= 0 ? true : false),
			new ButtonBuilder()
				.setCustomId(`SNMVoteSystemVoting - ${selectedMovie}`)
				.setLabel('Vote')
				.setStyle(ButtonStyle.Success)
				.setDisabled(remainingVotes === 0 ? true : false),
			new ButtonBuilder()
				.setCustomId('SNMVoteSystem - votesAvailable')
				.setLabel(
					remainingVotes
						? `You have ${remainingVotes} votes available`
						: 'You used all your votes!',
				)
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(true),
			new ButtonBuilder()
				.setCustomId('SNMVoteSystemClear')
				.setStyle(ButtonStyle.Danger)
				.setLabel('Clear')
				.setDisabled(remainingVotes >= snmServer.maxVotes ? true : false),
			new ButtonBuilder()
				.setCustomId(`SNMVoteSystemNext - ${selectedMovie + 1}`)
				.setEmoji('▶️')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(selectedMovie + 1 <= lastSNM.movieCount ? false : true),
		]),
	];

	if (message) {
		actionRows.push(
			new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId('SNMVotingSystemMessage')
					.setLabel(message)
					.setDisabled(true)
					.setStyle(ButtonStyle.Secondary),
			),
		);
	}

	return actionRows;
};

export const snmVotesCommand = {
	data: new SlashCommandBuilder()
		.setName('snmvotes')
		.setDescription('Manage your current SNM votes')
		.addStringOption((option) =>
			option
				.setName('command')
				.setDescription('Start voting, show or clear your votes')
				.setChoices(
					{ name: 'Start', value: 'start' },
					{ name: 'Show', value: 'show' },
					{ name: 'Clear', value: 'clear' },
				),
		)
		.setDMPermission(false),
	/**
	 * @param {ChatInputCommandInteraction|ButtonInteraction} interaction
	 * @param {string} actionFromVoteMessage the actionId from button interaction
	 * @param {boolean} fromMenu if interaction comes from SNM Voting System™
	 */
	handler: async function(interaction, actionFromVoteMessage, fromMenu) {
		try {
			const choice =
				actionFromVoteMessage || interaction.options.getString('command');

			// If interaction has come from slash command we need to defer, otherwise it was already deferred by the InteractionCreate
			if (!actionFromVoteMessage && !fromMenu) {
				interaction.deferReply({ ephemeral: true });
			}

			const lastSNM = await getSNMWeek(interaction.guildId);
			const snmServer = await getSNMServer(interaction.guildId);
			const userFound = lastSNM.users.find(
				(user) => user.userId === interaction.member.user.id,
			);

			// Week doesn't exist
			if (!lastSNM.week) {
				return await interaction.editReply('No week to interact with.');
			}
			else if (
				(!userFound || !userFound.votes || userFound.votes.length === 0) &&
				choice !== 'start'
			) {
				return await interaction.editReply('You have not voted.');
			}

			if (choice === 'start') {
				if (lastSNM.status != 'voting') {
					return await interaction.editReply('Voting has not started yet.');
				}
				// Create initial select menu
				const votingActionRows = generateVotingComponents(
					interaction,
					lastSNM,
					snmServer,
				);
				return await interaction.editReply({
					components: votingActionRows,
					embeds: [
						lastSNM.users
							.find(
								(u) => u.movies.find((m) => m.titleKey === 1).titleKey === 1,
							)
							.movies.find((m) => m.titleKey === 1).compactMovieEmbed,
					],
				});
			}
			else if (!choice || choice === 'show') {
				const moviesVoted = [];
				userFound.votes.forEach((movieTitleKey) => {
					moviesVoted.push(
						`\`${
							lastSNM.users
								.find((user) =>
									user.movies.find((movie) => movie.titleKey === movieTitleKey),
								)
								.movies.find((movie) => movie.titleKey === movieTitleKey).title
						}\``,
					);
				});
				return await interaction.editReply(
					`Your votes: ${moviesVoted.join(' | ')}`,
				);
			}
			else if (choice === 'clear') {
				if (lastSNM.status === 'finished') {
					return await interaction.editReply(
						'SNM is finished. You can\'t alter your votes 👀.',
					);
				}
				userFound.votes = [];
				await upsertSNMWeek(lastSNM);
				if (fromMenu) {
					// get current default so the voting screen stays in the same movie
					const currDefault =
						interaction.message.components[0].components[0].options.find(
							(o) => o.default === true,
						);
					return await interaction.editReply({
						components: generateVotingComponents(
							interaction,
							lastSNM,
							snmServer,
							Number(currDefault.value),
							'Your votes have been cleared.',
						),
					});
				}
				return await interaction.editReply('Your votes have been cleared.');
			}
		}
		catch (e) {
			reportError(e, interaction);
		}
	},
};
