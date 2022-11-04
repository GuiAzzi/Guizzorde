import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	Events,
	ModalSubmitInteraction,
	ActionRowBuilder,
	EmbedBuilder,
} from 'discord.js';

import {
	getSNMWeek,
	SNMWeekArray,
	upsertSNMWeek,
} from '../../guild/Sunday Night Movie/index.js';
import { reportError } from '../../../util/index.js';

export const snmRateCommand = {
	data: new SlashCommandBuilder()
		.setName('snmrate')
		.setDescription('Add or change your current SNM rating')
		.setDMPermission(false),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		try {
			// Uses SNM from cache if it's finished, otherwise grabs last finished SNM from database
			const lastFinishedSNM =
				SNMWeekArray.get(interaction.guildId)?.status === 'finished'
					? SNMWeekArray.get(interaction.guildId)
					: await getSNMWeek(interaction.guildId, null, 'finished');
			const userObject = lastFinishedSNM.users.find(
				(u) => u.userId === interaction.user.id,
			);

			if (!lastFinishedSNM?.week) {
				return await interaction.reply('No week to interact with.');
			}
			const modal = new ModalBuilder()
				.setCustomId(`SNMRateModal - ${lastFinishedSNM.week}`)
				.setTitle(
					userObject?.rating
						? `Adding rating for SNM ${lastFinishedSNM.week}`
						: `Editing rating for SNM ${lastFinishedSNM.week}`,
				)
				.addComponents(
					new ActionRowBuilder().addComponents(
						new TextInputBuilder()
							.setCustomId('SNMRateModalText')
							.setLabel('Rating')
							.setStyle(TextInputStyle.Paragraph)
							.setValue(userObject?.rating ? userObject.rating : '')
							.setMaxLength(280)
							.setRequired(true),
					),
				);

			await interaction.showModal(modal);
		}
		catch (e) {
			reportError(e, interaction);
		}
	},
};

export const snmRateModalInteractionCreate = {
	name: Events.InteractionCreate,
	once: false,
	/**
	 * @param {ModalSubmitInteraction} interaction
	 */
	async handler(interaction) {
		if (!interaction.isModalSubmit()) return;
		if (!interaction.customId.startsWith('SNMRateModal')) return;

		await interaction.deferReply();

		try {
			// Uses SNM from cache if it's finished, otherwise grabs last finished SNM from database
			const week = interaction.customId.split('- ')[1];
			const rating = interaction.fields.getTextInputValue('SNMRateModalText');

			const snmWeekToRate = await getSNMWeek(
				interaction.guildId,
				Number(week),
				'finished',
			);

			let userObject = snmWeekToRate.users.find(
				(u) => u.userId === interaction.user.id,
			);

			// If new user
			if (!userObject) {
				userObject =
					snmWeekToRate.users[
						snmWeekToRate.users.push({
							userId: interaction.member.user.id,
							username: interaction.member.user.username,
							movies: [],
							votes: [],
						}) - 1
					];
			}

			userObject.rating = rating;

			await upsertSNMWeek(snmWeekToRate);

			return await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor(0x3498db)
						.setAuthor({
							name: interaction.member.user.username,
							iconURL: interaction.member.user.avatar
								? `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}`
								: 'https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png',
						})
						.setDescription(rating)
						.setTimestamp(new Date())
						.setFooter({ text: `SNM ${snmWeekToRate.week}` }),
				],
			});
		}
		catch (e) {
			reportError(e, interaction);
		}
	},
};
