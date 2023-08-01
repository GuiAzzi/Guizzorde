import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const tomaCommand = {
  data: new SlashCommandBuilder().setName('toma').setDescription('...toma...'),
  /**
	 * @param {ChatInputCommandInteraction} interaction
	 */
  handler: async function(interaction) {
    return interaction.reply(
      'https://cdn.discordapp.com/emojis/487347201706819584.png',
    );
  },
};
