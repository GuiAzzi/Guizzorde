import { CommandInteraction, EmbedBuilder } from 'discord.js';

// import { client, configObj } from '../config/index.js';

/**
 * Logs an error and tries to message owner
 * @param {string} err
 * @param {CommandInteraction} interaction
 */
export function reportError(err, interaction) {
	const errorEmbed = new EmbedBuilder()
		.setTitle('Error')
		.setDescription('An error has occured. Please report this bug.')
		.setColor('Red')
		.setFooter({ text: `ID: ${Date.now()}` });
	console.error('APP Error\n', err);
	if (interaction) {
		if (!interaction.replied && !interaction.deferred) {
			interaction.reply({
				content: 'There was an error while executing this command',
				embeds: [errorEmbed],
				components: null,
			});
		}
		else {
			interaction.editReply({
				content: 'There was an error while executing this command',
				embeds: [errorEmbed],
				components: null,
			});
		}
	}
	// client.users
	// 	.fetch(configObj.ownerId)
	// 	.then((owner) => owner.send(err));
}
