import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { configObj } from '../../../config/index.js';
import { reportError } from '../../../util/index.js';

import OS from 'opensubtitles.com';
import { EmbedBuilder } from '@discordjs/builders';

// OpenSub Auth
export const searchSubtitle = async (title, lang = 'en') => {
  try {
    const OpenSubtitles = new OS({ apikey: configObj.OSCredentials[0] });
    await OpenSubtitles.login({
      username: configObj.OSCredentials[1],
      password: configObj.OSCredentials[2],
    });
    const sub = await OpenSubtitles.subtitles({
      languages: lang,
      query: title,
    });

    let downloadLink;
    if (sub.data.length) {
      downloadLink = await OpenSubtitles.download({
        file_id: sub.data[0].id,
      });

      return (
        { attributes: sub.data[0].attributes, link: downloadLink.link } || false
      );
    }
    else {
      return false;
    }
  }
  catch (e) {
    reportError(e);
    return false;
  }
};

export const subtitleCommand = {
  data: new SlashCommandBuilder()
    .setName('subtitle')
    .setDescription('Search for a subtitle file')
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('Your search text (Filename is usually better)')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('language')
        .setDescription('The language to search for. Default is English')
        .addChoices(
          { name: 'English', value: 'en' },
          { name: 'Brazilian Portuguese', value: 'pt-br' },
        ),
    ),
  /**
	 * @param {ChatInputCommandInteraction} interaction
	 */
  handler: async function(interaction) {
    const title = interaction.options.getString('title');
    const lang = interaction.options.getString('language');

    interaction.deferReply();

    const sub = await searchSubtitle(title, lang);

    const subEmbed = new EmbedBuilder()
      .setTitle('Subtitle')
      .setColor(0x3498db)
      .setFooter({
        text: 'Tip: You can paste the file name to try a perfect match!',
      });

    if (sub) {
      return await interaction.editReply({
        embeds: [
          subEmbed.setDescription(
            `[${sub.attributes.release}](${sub.link})\n${sub.attributes.language} | ${sub.attributes.download_count} downloads`,
          ),
        ],
      });
    }
  },
};
