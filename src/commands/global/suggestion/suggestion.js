import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Client } from '@notionhq/client';

import { configObj } from '../../../config/index.js';
import { reportError } from '../../../util/index.js';
import { EmbedBuilder } from '@discordjs/builders';

export const suggestionCommand = {
  data: new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Make a feature suggestion')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('Write your suggestion here')
        .setRequired(true),
    ),
  /**
	 * @param {ChatInputCommandInteraction} interaction
	 */
  handler: async function(interaction) {
    try {
      const text = interaction.options.getString('text');

      await interaction.deferReply({ ephemeral: true });

      const notion = new Client({ auth: configObj.notionToken });
      const databaseId = configObj.notionDatabaseId;

      const response = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          title: {
            title: [{ text: { content: text } }],
          },
          Status: {
            type: 'select',
            select: { name: 'Suggestions' },
          },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              text: [
                {
                  text: {
                    content: `Suggestion sent by ${
                      interaction.member?.user.username ||
											interaction.user.username
                    }`,
                  },
                },
              ],
            },
          },
        ],
      });

      if (response) {
        return await interaction.editReply(
          'Suggestion saved. Thank you! 😇\nTrack progress at <https://guizzo.notion.site/Guizzorde-8532e366c71d4ce993bfa090495cde1f>',
        );
      }
    }
    catch (e) {
      reportError(e, interaction);

      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(e)
        .setColor('Red')
        .setFooter({ text: 'Report this to my owner if you can!' });

      return await interaction.editReply({ embeds: [embed] });
    }
  },
};
