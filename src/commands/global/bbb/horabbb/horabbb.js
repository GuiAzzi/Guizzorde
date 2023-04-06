import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
} from 'discord.js';
import puppeteer from 'puppeteer';

import { reportError } from '../../../../util/index.js';

export const horaBBBCommand = {
	data: new SlashCommandBuilder()
		.setName('horabbb')
		.setDescription('Mostra o horário do BBB hoje'),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		await interaction.deferReply();
		const browser = await puppeteer.launch();

		try {
			const bbbURL = 'https://redeglobo.globo.com/sao-paulo/programacao/';

			const page = await browser.newPage();

			try {
				await page.goto(bbbURL);
			}
			catch (e) {
				return await interaction.editReply({
					content: 'A página da Globo não carregou 🤷‍♂️',
				});
			}

			const selector = await page.waitForSelector('text/Big Brother Brasil', {
				timeout: 1_000,
			});

			if (!selector) {
				return await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setTitle('Não achei o horario :(')
							.setDescription(`Mas deve ter aqui:\n${bbbURL}`)
							.setFooter({ text: 'dicupa' })
							.setColor('#4286f4'),
					],
				});
			}

			const programName = await selector.evaluate((el) => el.textContent);
			const programTime = await selector.evaluate(
				(el) => el.parentElement.querySelector('.programee-time').textContent,
			);
			const programImage = await selector.evaluate((el) =>
				el.parentElement.querySelector('.programee-logo').getAttribute('src'),
			);
			const programHourAndMin = programTime.split(':');
			const programDate = Math.floor(
				new Date().setHours(programHourAndMin[0], programHourAndMin[1], 0) /
					1000,
			);

			return await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle(programName)
						.setDescription(`<t:${programDate}:t>\n<t:${programDate}:R>`)
						.setThumbnail(programImage)
						.setColor('#4286f4'),
				],
			});
		}
		catch (e) {
			reportError(e, interaction);
		}
		finally {
			browser.close();
		}
	},
};
