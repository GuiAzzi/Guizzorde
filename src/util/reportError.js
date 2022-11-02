// eslint-disable-next-line no-unused-vars
import { CommandInteraction } from 'discord.js';

// import { client, configObj } from '../config/index.js';

/**
 * Logs an error and tries to message owner
 * @param {string} err
 * @param {CommandInteraction} interaction
 */
export function reportError(err, interaction) {
	console.error('APP Error\n', err);
	// client.users
	// 	.fetch(configObj.ownerId)
	// 	.then((owner) => owner.send(err));

	if (interaction) interaction.editReply('An error has occured.');
}
