// eslint-disable-next-line no-unused-vars
import { Events, ChatInputCommandInteraction } from 'discord.js';

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
			await command.handler(interaction);
			console.log(
				`${interaction.user.username} executed "${interaction.commandName}"${
					interaction.options.data.length
						? ` with "${JSON.stringify(interaction.options.data)}"`
						: ''
				}${
					interaction.inGuild()
						? ` in "${interaction.guild.name}":${interaction.guildId}`
						: ' via DM'
				}`,
			);
		}
		catch (error) {
			console.error(error);
			await interaction.reply({
				content: 'There was an error while executing this command!',
				ephemeral: true,
			});
		}
	},
};
