import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';

import { configObj } from '../../../config/index.js';
import { reportError } from '../../../util/index.js';
import { player_connection } from '../play/play.js';

export const stopCommand = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops the currently playing audio')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  /**
	 * @param {ChatInputCommandInteraction} interaction
	 */
  handler: async function(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      if (
        interaction.user.id !== configObj.ownerId &&
				interaction.user.id !== '524072816560177154'
      ) {
        console.log('not owner');
        return interaction.editReply({
          content: 'Not yet available',
          ephemeral: true,
        });
      }

      player_connection.connection?.disconnect();
      player_connection.connection?.destroy();
    }
    catch (e) {
      player_connection.player?.stop();
      player_connection.connection?.disconnect();
      player_connection.connection.destroy();

      reportError(e);
    }
  },
};
