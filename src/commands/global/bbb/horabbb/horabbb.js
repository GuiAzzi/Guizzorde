import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
} from 'discord.js';
import axios from 'axios';
import { JSDOM } from 'jsdom';

import { reportError } from '../../../../util/index.js';

export const horaBBBCommand = {
	data: new SlashCommandBuilder()
		.setName('horabbb')
		.setDescription('Mostra o horário do BBB hoje'),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		try {
			await interaction.deferReply();

			const response = await axios.get(
				'https://redeglobo.globo.com/sao-paulo/programacao',
			);

			if (response.status !== 200) {
				return interaction.editReply({
					content: 'A página da Globo não carregou 🤷‍♂️',
				});
			}

			const body = new JSDOM(response.data).window.document;

			for (const el of body.querySelectorAll(
				'.schedule-items.schedule-items--activated section',
			)) {
				const header = el.querySelector('.schedule-item-header-info');
				if (
					header.querySelector('h2')?.innerHTML.startsWith('Big Brother Brasil')
				) {
					const startTime = header
						.querySelector('.schedule-item-header-time time')
						.getAttribute('data-start-time');
					const endTime = header
						.querySelector('.schedule-item-header-time time')
						.getAttribute('data-end-time');
					return interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setTitle('Big Brother Brasil 22')
								.setDescription(
									`<t:${startTime}:t> até <t:${endTime}:t>\n<t:${startTime}:R>`,
								)
								.setThumbnail(
									el
										.querySelector('.schedule-item-header-logo')
										.querySelector('img')
										.getAttribute('src'),
								)
								.setColor('#4286f4'),
						],
					});
				}
			}

			return interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle('Não achei o horario :(')
						.setDescription(
							'Mas deve ter aqui:\nhttps://redeglobo.globo.com/sao-paulo/programacao',
						)
						.setFooter({ text: 'dicupa' })
						.setColor('#4286f4'),
				],
			});
		}
		catch (e) {
			reportError(e);
		}
	},
};
