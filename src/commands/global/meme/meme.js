import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

// Base Memes Array
const memes = [
  {
    name: 'crab',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/557765021359276043/VghsxturtIjzwLuU.mp4',
  },
  {
    name: 'otter',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777058314257039421/they_dance.mp4',
  },
  {
    name: 'muchacho',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777058321970495488/wSsUAVNbJK1L1vlM.mp4',
  },
  {
    name: 'flamingo',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777058394158530580/Flamingo.mp4',
  },
  {
    name: 'wtf',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777064438904782848/jar1.png\nhttps://cdn.discordapp.com/attachments/168624317049995264/777064448804126720/jar2.mp4\nhttps://cdn.discordapp.com/attachments/168624317049995264/777064446652186630/jar3.png',
  },
  {
    name: 'vibing',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777065041685905408/lord_vibin.mp4',
  },
  {
    name: 'seal',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777065138011373609/Clap_seal.mp4',
  },
  {
    name: 'ham',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777065294538604554/good_kitty.mp4',
  },
  {
    name: 'butt',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777238203153252392/dash_360.mp4',
  },
  {
    name: 'AAaa',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777238229161213962/v09044f70000bf3e6i3r587n6scu148g.mp4',
  },
  {
    name: 'shrek',
    meme: 'https://cdn.discordapp.com/attachments/724976219757609030/781492478141530133/Fuck_it_entire_Shrek_Movie.webm',
  },
  {
    name: 'taps',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/786313840769892352/Fastest_taps_in_the_west.mp4',
  },
  {
    name: 'pain',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/788167349014495232/Qlqkyivabf81lmv8-1.webm',
  },
  {
    name: 'motor',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/800566815666470922/Pelican_Motor_Mouth.mp4',
  },
  {
    name: 'animals are leaving',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/809568621923008542/o9HmFOlY3-uvW4Ys.mp4',
  },
  {
    name: 'yoshi',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/890379430357250048/yoshi-dancando.mov',
  },
  {
    name: 'halloween',
    meme: 'https://cdn.discordapp.com/attachments/168624317049995264/893926859799142541/Lonely_Halloween_Song.mp4',
  },
];

// Usable Memes Array
// This exists so we can remove rolled used memes, then recreate the array when all memes have been used
let usableMemes = [...memes];

export const memeCommand = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Send a random meme in chat!')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription(
          'Choose a specific meme. Type "list" to see all available memes.',
        ),
    ),
  /**
	 * @param {ChatInputCommandInteraction} interaction
	 */
  handler: async function(interaction) {
    const name = interaction.options.getString('name');

    // If no name was passed = send random meme
    if (!name || name.name === '') {
      if (usableMemes.length === 0) usableMemes = [...memes];
      const randomMemeIndex = Math.floor(Math.random() * usableMemes.length);
      return interaction.reply({
        content: usableMemes.splice(randomMemeIndex, 1)[0].meme,
      });
    }

    // If list is requested
    if (name.trim().toLowerCase() === 'list') {
      return interaction.reply({
        content: `**Available Memes**\n\`\`\`${memes
          .map((meme) => meme.name)
          .join('\n')}\`\`\``,
        ephemeral: true,
      });
    }

    // If a specific meme is requested
    else if (name) {
      const selectedMeme = memes.find((meme) => meme.name === name);
      if (selectedMeme) {return interaction.reply({ content: selectedMeme.meme });}
      else {
        return interaction.reply({
          content: 'No meme with that name found.\nCheck out the list with `/meme list`.',
          ephemeral: true,
        });
      }
    }
  },
};
