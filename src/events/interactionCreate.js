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
			await command.handler(interaction);
			console.log(`"${interaction.commandName}" executed successfully.\n`);
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
