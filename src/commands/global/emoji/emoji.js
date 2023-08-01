import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const emojiCommand = {
  data: new SlashCommandBuilder()
    .setName('emoji')
    .setDescription(
      'Convert your message into Discord\'s regional indicator emojis :abc:',
    )
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('Text to be converted')
        .setRequired(true),
    ),
  /**
	 * @param {ChatInputCommandInteraction} interaction
	 */
  handler: async function(interaction) {
    const message = interaction.options.getString('message');

    // Converts the inputed message to discord's regional emojis
    let sentence = '';
    for (const letter of message) {
      switch (letter) {
      case ' ': {
        sentence += '  ';
        break;
      }
      case '0': {
        sentence += ':zero: ';
        break;
      }
      case '1': {
        sentence += ':one: ';
        break;
      }
      case '2': {
        sentence += ':two: ';
        break;
      }
      case '3': {
        sentence += ':three: ';
        break;
      }
      case '4': {
        sentence += ':four: ';
        break;
      }
      case '5': {
        sentence += ':five: ';
        break;
      }
      case '6': {
        sentence += ':six: ';
        break;
      }
      case '7': {
        sentence += ':seven: ';
        break;
      }
      case '8': {
        sentence += ':eight: ';
        break;
      }
      case '9': {
        sentence += ':nine: ';
        break;
      }
      case '!': {
        sentence += ':exclamation:';
        break;
      }
      default: {
        const char = letter
          .toLocaleLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        if (/[$-/:-?{-~!@#"^_`[\]]/.test(char)) {
          sentence += char + ' ';
        }
        else {
          sentence += ':regional_indicator_' + char + ': ';
        }
        break;
      }
      }
    }
    return interaction.reply(sentence);
  },
};
