import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
} from 'discord.js';
import Jimp from 'jimp/dist/index.js';

export const ratoCommand = {
	data: new SlashCommandBuilder()
		.setName('rato')
		.setDescription('Send a random tenista™ in chat!')
		.addStringOption((option) =>
			option
				.setName('message')
				.setDescription('Make rato tenista say something.'),
		),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		const ratoMessage = interaction.options.getString('message');

		// If theres a message
		if (ratoMessage) {
			interaction.deferReply();
			// Uses rato_plaquista as templete for text
			Jimp.read('src/commands/global/rato/rato_plaquista4x.png').then((image) => {
				Jimp.loadFont('src/commands/global/rato/font/rato_fontista.fnt').then((font) => {
					image.print(font, 240, 40, ratoMessage, 530);
					image
						.writeAsync('src/commands/global/rato/rato_plaquistaEditado.jpg')
						// eslint-disable-next-line no-unused-vars
						.then(async (result) => {
							await interaction.editReply({
								files: ['src/commands/global/rato/rato_plaquistaEditado.jpg'],
							});
						});
				});
			});
		}
		// Generates a message with a random 'rato tenista' image
		else {
			return interaction.reply({
				content: 'ei!! por favor pare!\nisto me deixa',
				files: [`src/commands/global/rato/tenistas/rato${Math.floor(Math.random() * 72)}.jpg`],
			});
		}
	},
};
