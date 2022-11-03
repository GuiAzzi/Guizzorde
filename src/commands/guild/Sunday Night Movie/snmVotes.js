import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
} from 'discord.js';

import {
	getSNMWeek,
	upsertSNMWeek,
} from '../../guild/Sunday Night Movie/index.js';
import { reportError } from '../../../util/index.js';

export const snmVotesCommand = {
	data: new SlashCommandBuilder()
		.setName('snmvotes')
		.setDescription('Manage your current SNM votes')
		.addStringOption((option) =>
			option
				.setName('command')
				.setDescription('Show or clear your votes')
				.setChoices(
					{ name: 'Show', value: 'show' },
					{ name: 'Clear', value: 'clear' },
				)
				.setRequired(true),
		)
		.setDMPermission(false),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 * @param {boolean} actionFromVoteMessage whether this came from the button component
	 */
	handler: async function(interaction, actionFromVoteMessage) {
		try {
			const choice =
				actionFromVoteMessage || interaction.options.getString('command');

			// Defers reply
			!actionFromVoteMessage
				? interaction.deferReply({ ephemeral: true })
				: null;

			const lastSNM = await getSNMWeek(interaction.guildId);
			const userFound = lastSNM.users.find(
				(user) => user.userId === interaction.member.user.id,
			);

			// Week doesn't exist
			if (!lastSNM.week) {
				return await interaction.editReply('No week to interact with.');
			}
			else if (
				!userFound ||
				!userFound.votes ||
				userFound.votes.length === 0
			) {
				return await interaction.editReply('You have not voted.');
			}

			if (choice === 'show') {
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
				return await interaction.editReply('Your votes have been cleared.');
			}
		}
		catch (e) {
			reportError(e);
		}
	},
};
