import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Role,
} from 'discord.js';
import OpenAI from 'openai-api';

import {
  getSNMWeek,
  SNMWeek,
  generateOpenAIList,
  upsertSNMWeek,
} from '../../guild/Sunday Night Movie/index.js';
import { generateMovieEmbed, searchTitles } from '../../global/movie/movie.js';
import { randomEmoji, reportError } from '../../../util/index.js';
import { client, configObj } from '../../../config/index.js';

// OpenAI
export const openai = new OpenAI(configObj.openAIApiKey);

export const snmAdminCommand = {
  data: new SlashCommandBuilder()
    .setName('snmadmin')
    .setDescription('Manage the current SNM period')
    .addStringOption((option) =>
      option
        .setName('command')
        .setDescription('The admin command to run')
        .setChoices(
          { name: 'New - Create a new SNM', value: 'new' },
          { name: 'Start - Start current SNM voting', value: 'start' },
          { name: 'End - End current SNM voting', value: 'end' },
        )
        .setRequired(true),
    )
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  /**
   * @param {ChatInputCommandInteraction} interaction
   * @param {boolean} fromScheduler whether this came from the CronJob or not
   */
  handler: async function(interaction, fromScheduler) {
    const command = interaction.options.getString('command');

    // if fromSchedules: true = command executed from scheduler
    // scheduleMsg holds Discord.Message obj
    let scheduleMsg;

    switch (command) {
    case 'new': {
      try {
        // Can only be used by admins and bot self
        // if (
        // 	!memberPerformed.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
        // 		interaction.member.user.id !== client.user.id
        // ) {
        // 	if (!fromScheduler) {
        // 		return interaction.reply({
        // 			content: 'Insufficient permissions.',
        // 			ephemeral: true,
        // 		});
        // 	}
        // 	break;
        // }

        // Interaction first contact (to be edited)
        const newSNMEmbed = new EmbedBuilder()
          .setTitle('Creating SNM')
          .setDescription('🛠 Working...')
          .setColor(0x3498db);
        if (!fromScheduler) {
          await interaction.deferReply();
        }
        else {
          // If bot can't get channel - it may have been deleted
          if (!interaction.client.channels.cache.get(interaction.channelId)) {
            return reportError(
              `Couldn't get defaultChannel of ${interaction.guildId}. Maybe it was deleted?`,
            );
          }

          scheduleMsg = await interaction.client.channels.cache
            .get(interaction.channelId)
            .send({ embeds: [newSNMEmbed] });
        }

        const lastSNM = await getSNMWeek(interaction.guildId);

        if (lastSNM.week && lastSNM.status != 'finished') {
          newSNMEmbed
            .setTitle('Can\'t start new SNM')
            .setDescription(
              `Sunday Night Movie ${lastSNM.week} is \`${lastSNM.status}\``,
            );

          if (!fromScheduler) {
            await interaction.editReply({ embeds: [newSNMEmbed] });
          }
          else {
            scheduleMsg.edit({ embeds: [newSNMEmbed] });
          }
          break;
        }

        let newSNM = new SNMWeek({
          guildId: interaction.guildId,
          week: lastSNM?.week + 1 || 1,
          status: 'ongoing',
          movieCount: 0,
          paused: lastSNM?.paused ? true : false,
          users: [],
          winner: '',
        });

        // Creates a movie suggestion with OpenAI
        // Don't do it if first week => no movies to sample
        // Don't do it if on test bot (App ID 558090301160292352)
        let openAISeeded;
        if (lastSNM.week > 1) {
          try {
            const prompt = `This is my list of watched movies. Suggest a new released movie that you think I would enjoy based on the previous movies. Create the ${
              newSNM.week
            } entry without repeating from the list. Follow this pattern: "${
              newSNM.week
            } - Movie Name (Release Year)":\n\n${await generateOpenAIList(
              interaction.guildId,
            )}`;

            const response = await openai.complete({
              engine: 'davinci',
              prompt: prompt,
              maxTokens: 20,
              temperature: 0.7,
              topP: 1,
              presencePenalty: 0,
              frequencyPenalty: 0,
              bestOf: 1,
              n: 1,
              stream: false,
            });

            // OpenAI generates some lines, we just want the first one
            let openAIEntry = response.data.choices[0].text.split('\n')[1];
            // If OpenAI generated a line with week+1
            if (openAIEntry.startsWith(`${newSNM.week}`)) {
              openAIEntry = openAIEntry
                .replace(`${newSNM.week} - `, '')
                .replace(/\(\d+?\)/, '')
                .trim();

              const titleFound = await searchTitles(openAIEntry, 1);
              newSNM.users.push({
                userId: interaction.client.user.id,
                username: interaction.client.user.username,
                movies: [
                  {
                    tmdbId: `tmdb${titleFound[0]?.id}`,
                    title: titleFound
                      ? `${titleFound[0].title} (${
                        titleFound[0].release_date.split('-')[0]
                      })`
                      : openAIEntry,
                    titleKey: 1,
                  },
                ],
              });
              newSNM.movieCount += 1;
              openAISeeded = (
                await generateMovieEmbed(
                  openAIEntry,
                  null,
                  `tmdb${titleFound[0]?.id}`,
                  true,
                )
              )
                .setDescription('🤖 Guizzorde\'s Suggestion 🤖')
                .setFooter({ text: 'Powered by OpenAI' })
                .setColor(0x3498db);
              newSNM.users[0].movies[0].compactMovieEmbed =
                  openAISeeded.toJSON();
            }
          }
          catch (e) {
            console.error(e);
            openAISeeded = false;
          }
        }

        newSNM = await upsertSNMWeek(newSNM);
        // const SNMRole = await getSNMRole(interaction.guildId);
        newSNMEmbed
          .setTitle(`🎬 Sunday Night Movie ${newSNM.week} 🎬`)
          .setDescription(
            'Requests are now open!\n`/snmTitle add` to request a movie.',
          );
        if (!fromScheduler) {
          await interaction.editReply({
            embeds: openAISeeded
              ? [newSNMEmbed, openAISeeded]
              : [newSNMEmbed],
          });
        }
        else {
          scheduleMsg.edit({
            embeds: openAISeeded
              ? [newSNMEmbed, openAISeeded]
              : [newSNMEmbed],
          });
        }
      }
      catch (e) {
        reportError(e, interaction);
        if (!fromScheduler) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Error')
                .setDescription(
                  'An error has occured. Please report this bug.',
                )
                .setColor('Red'),
            ],
          });
        }
      }
      break;
    }
    case 'start': {
      try {
        // // Can only be used by admins and bot self
        // else if (
        // 	!memberPerformed.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
        // 		interaction.member.user.id !== client.user.id
        // ) {
        // 	if (!fromScheduler) {
        // 		await client.api
        // 			.interactions(interaction.id, interaction.token)
        // 			.callback.post({
        // 				data: {
        // 					type: 4,
        // 					data: {
        // 						content: 'Insufficient permissions.',
        // 						flags: 64,
        // 					},
        // 				},
        // 			});
        // 	}
        // 	break;
        // }

        // Interaction first contact (to be edited)
        const startSNMEmbed = new EmbedBuilder()
          .setTitle('Starting SNM')
          .setDescription('🛠 Working...')
          .setColor(0x3498db);
        let voteMessage;
        if (!fromScheduler) {
          voteMessage = await interaction.deferReply({ fetchReply: true });
        }
        else {
          // If bot can't get channel - it may have been deleted
          if (!client.channels.cache.get(interaction.channelId)) {
            return reportError(
              `Couldn't get defaultChannel of ${interaction.guildId}. Maybe it was deleted?`,
            );
          }

          scheduleMsg = await client.channels.cache
            .get(interaction.channelId)
            .send({ embeds: [startSNMEmbed] });
        }

        const lastSNM = await getSNMWeek(interaction.guildId);

        if (!lastSNM.week) {
          startSNMEmbed
            .setTitle('Error')
            .setDescription('No week to start')
            .setColor('Red');
          if (!fromScheduler) {
            await interaction.editReply({ embeds: [startSNMEmbed] });
          }
          else {
            await scheduleMsg.edit({ embeds: [startSNMEmbed] });
          }
          break;
        }
        else if (lastSNM.status === 'voting') {
          startSNMEmbed
            .setTitle('Error')
            .setDescription(
              `\`SNM ${lastSNM.week}\` voting has already started!`,
            )
            .setColor('Red');
          if (!fromScheduler) {
            await interaction.editReply({ embeds: [startSNMEmbed] });
          }
          else {
            await scheduleMsg.edit({ embeds: [startSNMEmbed] });
          }
          break;
        }
        else if (lastSNM.status === 'finished') {
          startSNMEmbed
            .setTitle('Error')
            .setDescription(`\`SNM ${lastSNM.week}\` is finished.`)
            .setColor('Red');
          if (!fromScheduler) {
            await interaction.editReply({ embeds: [startSNMEmbed] });
          }
          else {
            await scheduleMsg.edit({ embeds: [startSNMEmbed] });
          }
          break;
        }

        lastSNM.status = 'voting';
        lastSNM.voteMessage = {
          channelId: voteMessage?.channel.id || scheduleMsg?.channel.id,
          messageId: voteMessage?.id || scheduleMsg?.id,
        };

        const actionRow = new ActionRowBuilder().addComponents([
          new ButtonBuilder()
            .setCustomId('SNMVoteMessage - Start')
            .setLabel('Start Voting')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('SNMVoteMessage - Show')
            .setLabel('Show Votes')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('SNMVoteMessage - Clear')
            .setLabel('Clear Votes')
            .setStyle(ButtonStyle.Danger),
        ]);

        // Builds rich embed with a random emoji for each movie
        const printArray = [];
        const emojiArray = client.guilds.cache.get(interaction.guildId).emojis
          .cache;
        const emojisUsed = [];

        lastSNM.users.forEach((user) => {
          user.movies.forEach((movie) => {
            let rndEmoji;
            if (emojiArray.size !== 0) {
              rndEmoji = emojiArray.random();
              printArray[
                movie.titleKey - 1
              ] = `<:${rndEmoji.name}:${rndEmoji.id}> - ${movie.title}\n`;
              emojisUsed[movie.titleKey - 1] = {
                titleKey: movie.titleKey,
                emoji: rndEmoji.identifier,
              };
              emojiArray.delete(rndEmoji.id);
            }
            // It will break if there are more movies than custom emojis
            else {
              rndEmoji = randomEmoji();
              while (emojisUsed.includes(rndEmoji)) {
                rndEmoji = randomEmoji();
              }
              printArray[
                movie.titleKey - 1
              ] = `${rndEmoji} - ${movie.title}\n`;
              emojisUsed[movie.titleKey - 1] = {
                titleKey: movie.titleKey,
                emoji: rndEmoji,
              };
            }
          });
        });
        lastSNM.emojisUsed = emojisUsed;
        await upsertSNMWeek(lastSNM);

        const SNMRole = await getSNMRole(interaction.guildId);

        // Create the embed with titles, emojis and buttons
        const votingEmbed = new EmbedBuilder()
          .setTitle(`🌟 Sunday Night Movie ${lastSNM.week} 🌟`)
          .setColor(0x3498db)
          .setDescription(printArray.join(' '))
          .setFooter({ text: 'Vote by clicking "Start Voting" below!' });

        const mentionMsg = `${
          SNMRole ? '<@&' + SNMRole.id + '> ' : '@here'
        } Voting has started!`;
        if (!fromScheduler) {
          await interaction.editReply({
            embeds: [votingEmbed],
            components: [actionRow],
          });
          await interaction.followUp({ content: mentionMsg });
        }
        else {
          await scheduleMsg.edit({
            embeds: [votingEmbed],
            components: [actionRow],
          });
          await client.channels.cache
            .get(interaction.channelId)
            .send({ content: mentionMsg });
        }
      }
      catch (e) {
        reportError(e, interaction);
      }
      break;
    }
    case 'end': {
      try {
        // // Can only be used by admins and bot self
        // else if (
        // 	!memberPerformed.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
        // 		interaction.member.user.id !== client.user.id
        // ) {
        // 	if (!fromScheduler) {
        // 		await client.api
        // 			.interactions(interaction.id, interaction.token)
        // 			.callback.post({
        // 				data: {
        // 					type: 4,
        // 					data: {
        // 						content: 'Insufficient permissions.',
        // 						flags: 64,
        // 					},
        // 				},
        // 			});
        // 	}
        // 	break;
        // }

        // Interaction first contact (to be edited)
        const endSNMEmbed = new EmbedBuilder()
          .setTitle('Ending SNM')
          .setDescription('🛠 Working...')
          .setColor(0x3498db);
        if (!fromScheduler) {
          await interaction.deferReply();
        }
        else {
          // If bot can't get channel - it may have been deleted
          if (!(await client.channels.cache.get(interaction.channelId))) {
            return reportError(
              `Couldn't get defaultChannel of ${interaction.guildId}. Maybe it was deleted?`,
            );
          }

          scheduleMsg = await client.channels.cache
            .get(interaction.channelId)
            .send({ embeds: [endSNMEmbed] });
        }

        let embedDescription;

        const lastSNM = await getSNMWeek(interaction.guildId);

        if (!lastSNM.week) {
          endSNMEmbed
            .setTitle('Error')
            .setDescription('No week to end')
            .setColor('Red');
          if (!fromScheduler) {
            await interaction.editReply({ embeds: [endSNMEmbed] });
          }
          else {
            await scheduleMsg.edit({ embeds: [endSNMEmbed] });
          }
          break;
        }

        // TODO: If a movie was passed - select it as winner
        // <logic (check github, I have this code on v1)>

        // FIXME: Doodoo code. Old and bad.
        // creates array with titleKey and voteCount (movie:votes) TODO: redo it as ({movieName, movieCode}:votes)
        const allVotes = [];

        for (const userIndex in lastSNM.users) {
          for (const movieIndex in lastSNM.users[userIndex].movies) {
            const titleKey =
                lastSNM.users[userIndex].movies[movieIndex].titleKey;
            !allVotes[titleKey - 1]
              ? (allVotes[titleKey - 1] = {
                titleKey: titleKey,
                voteCount: 0,
              })
              : (allVotes[titleKey - 1].titleKey = titleKey);
          }
          for (const voteIndex in lastSNM.users[userIndex].votes) {
            const voteTitleKey = lastSNM.users[userIndex].votes[voteIndex];
            !allVotes[voteTitleKey - 1]
              ? (allVotes[voteTitleKey - 1] = {
                titleKey: null,
                voteCount: 1,
              })
              : allVotes[voteTitleKey - 1].voteCount++;
          }
        }

        // get what voteCount is the highest
        const maxVotes = allVotes.reduce((prev, current) => {
          return prev.voteCount > current.voteCount ? prev : current;
        });
          // get movies that had more votes (=== maxVotes)
        const winners = allVotes.filter((obj) => {
          return obj.voteCount === maxVotes.voteCount;
        });
          // if more than 1 winner => tied
        if (winners.length > 1) {
          const tiedWinnersTitle = [];
          for (const winner in winners) {
            tiedWinnersTitle.push(
              lastSNM.users
                .find((user) =>
                  user.movies.find(
                    (movie) => movie.titleKey === winners[winner].titleKey,
                  ),
                )
                .movies.find(
                  (movie) => movie.titleKey === winners[winner].titleKey,
                ).title,
            );
          }

          embedDescription = `\n\`${tiedWinnersTitle.join('` | `')}\` got ${
            maxVotes.voteCount
          } votes each!\nRandomly picking a movie...\n\n`;
          endSNMEmbed
            .setTitle('😲 It\'s a tie! 😲')
            .setDescription(embedDescription + 'Checking...');
          if (!fromScheduler) {
            await interaction.editReply({ embeds: [endSNMEmbed] });
          }
          else {
            await scheduleMsg.edit({ embeds: [endSNMEmbed] });
          }
          const rndWinnerPos = Math.floor(Math.random() * winners.length);
          lastSNM.winner = winners[rndWinnerPos];
          lastSNM.winner.userId = lastSNM.users.find((user) =>
            user.movies.find(
              (movie) => movie.titleKey === lastSNM.winner.titleKey,
            ),
          ).userId;
        }
        else {
          embedDescription = `With ${maxVotes.voteCount} votes:\n\n`;
          endSNMEmbed
            .setTitle('🙌 We have a winner! 🙌')
            .setDescription(embedDescription + 'Checking...');
          if (!fromScheduler) {
            await interaction.editReply({ embeds: [endSNMEmbed] });
          }
          else {
            await scheduleMsg.edit({ embeds: [endSNMEmbed] });
          }
          lastSNM.winner = winners[0];
          lastSNM.winner.userId = lastSNM.users.find((user) =>
            user.movies.find(
              (movie) => movie.titleKey === lastSNM.winner.titleKey,
            ),
          ).userId;
        }

        const winnerMovie = lastSNM.users
          .find((user) =>
            user.movies.find(
              (movie) => movie.titleKey === lastSNM.winner.titleKey,
            ),
          )
          .movies.find((movie) => movie.titleKey === lastSNM.winner.titleKey);

        lastSNM.status = 'finished';
        await upsertSNMWeek(lastSNM);

        // Disables all buttons on finished SNM VoteMessage
        const lastSNMVoteMessage = client.channels.cache
          .get(lastSNM.voteMessage?.channelId)
          ?.messages.cache.get(lastSNM.voteMessage.messageId);

        if (lastSNMVoteMessage) {
          const newDisabledRows = [];
          for (const actionRow of lastSNMVoteMessage.components) {
            const disabledActionRow = ActionRowBuilder.from(actionRow);
            for (const component of disabledActionRow.components) {
              if (component.data.type === ComponentType.Button) {
                component.setDisabled(true);
              }
            }
            newDisabledRows.push(disabledActionRow);
          }
          await lastSNMVoteMessage.edit({
            embeds: [
              new EmbedBuilder({
                ...lastSNMVoteMessage.embeds[0].data,
              }).setFooter({ text: 'This voting has ended' }),
            ],
            components: newDisabledRows,
          });
        }

        endSNMEmbed.setDescription(
          embedDescription + `🎉 **${winnerMovie.title}** 🎉`,
        );

        if (!fromScheduler) {
          await interaction.editReply({ embeds: [endSNMEmbed] });
        }
        else {
          await scheduleMsg.edit({ embeds: [endSNMEmbed] });
        }

        // TODO: Add SNMServer defaultRegion
        // /movie followup message
        const movieEmbedMsg = await client.channels.cache
          .get(interaction.channelId)
          .send({
            embeds: [
              new EmbedBuilder().setTitle('Searching...').setColor(0x3498db),
            ],
          });
        const movieEmbed = await generateMovieEmbed(
          winnerMovie.title,
          null,
          winnerMovie?.tmdbId,
        );
        movieEmbed.setTimestamp(new Date());

        if (
          lastSNM.winner.userId &&
            movieEmbed.description != 'Movie not found 😞'
        ) {
          // Gets user that added the winner movie
          const winnerUser = await client.users.fetch(lastSNM.winner.userId);
          if (winnerUser) {
            movieEmbed.setAuthor({
              name: winnerUser.username,
              iconURL:
                  winnerUser.avatarURL() ||
                  'https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png',
            });
          }
        }

        movieEmbedMsg.edit({ embeds: [movieEmbed] });
      }
      catch (e) {
        reportError(e, interaction);
      }
    }
    }
  },
};

/**
 * Gets the '@SNM' role, if it exists
 * @param {string} guildId - The guild (Server) ID
 * @returns {Role}
 */
async function getSNMRole(guildId) {
  await (await client.guilds.fetch(guildId)).roles.fetch();
  return client.guilds.cache
    .get(guildId)
    .roles.cache.find(
      (role) =>
        role.name.toUpperCase() === 'SNM' || role.name.toUpperCase() === 'SNM™',
    );
}
