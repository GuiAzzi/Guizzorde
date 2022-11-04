import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
} from 'discord.js';

export const queridometroCommand = {
	data: new SlashCommandBuilder()
		.setName('queridometro')
		.setDescription('Rate a member from this server')
		.setDMPermission(false)
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription('Tag the user here')
				.setRequired(true),
		),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		// Gets user by ID
		const ratingUser = interaction.options.getUser('user');

		// Start interaction
		const queridometroMsg = await interaction.deferReply({ fetchReply: true });

		const queridometroEmojis = [
			'🐍',
			'🤮',
			'🙂',
			'☹',
			'💣',
			'♥',
			'💔',
			'🍌',
			'🪴',
		];

		// create queridometro embed
		const queridometroEmbed = new EmbedBuilder()
			.setTitle('Queridometro')
			.setColor(0x3498db)
			.setDescription(
				`Como você está se sentindo sobre <@!${ratingUser.id}> hoje?`,
			)
			.setImage(
				ratingUser.avatarURL() ||
					'https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png',
			)
			.setTimestamp(new Date());

		// Send message and react accordingly
		await interaction.editReply({ embeds: [queridometroEmbed] });
		for (let i = 0; i < queridometroEmojis.length; i++) {
			await queridometroMsg.react(queridometroEmojis[i]);
		}
	},
};
