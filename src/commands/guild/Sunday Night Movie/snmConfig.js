import { CronTime } from 'cron';
import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	EmbedBuilder,
} from 'discord.js';

import {
	getSNMServer,
	upsertSNMServer,
	SNMSchedulesArray,
} from '../../guild/Sunday Night Movie/index.js';
import { reportError } from '../../../util/index.js';

export const snmConfigCommand = {
	data: new SlashCommandBuilder()
		.setName('snmconfig')
		.setDescription('Check or change SNM settings for this Server')
		.addIntegerOption((option) =>
			option
				.setName('max_entries')
				.setDescription('Maximum number of entries allowed per user'),
		)
		.addIntegerOption((option) =>
			option
				.setName('max_votes')
				.setDescription('Maximum number of votes allowed per user'),
		)
		.addChannelOption((option) =>
			option
				.setName('default_channel')
				.setDescription(
					'Where should SNM messages be sent | Must be a text channel',
				),
		)
		.addBooleanOption((option) =>
			option
				.setName('schedule')
				.setDescription('Pauses or unpauses automatic SNM'),
		)
		.addStringOption((option) =>
			option
				.setName('new')
				.setDescription(
					'When to create a new SNM Week | CRON format https://crontab.guru/ | Enter "default" for Monday 8AM',
				),
		)
		.addStringOption((option) =>
			option
				.setName('start')
				.setDescription(
					'When to start SNM voting | CRON format https://crontab.guru/ | Enter "default" for Friday 8PM',
				),
		)
		.addStringOption((option) =>
			option
				.setName('end')
				.setDescription(
					'When to end SNM voting | CRON format https://crontab.guru/ | Enter "default" for Saturday 8PM',
				),
		)
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		try {
			await interaction.deferReply({ ephemeral: true });

			let snmServer = await getSNMServer(interaction.guildId);

			// If any param was passed -> update values
			if (interaction.options.data.length !== 0) {
				const cronRegex =
					/((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})|default/;
				const maxEntries = interaction.options.getInteger('max_entries');
				const maxVotes = interaction.options.getInteger('max_votes');
				const defaultChannel =
					interaction.options.getChannel('default_channel');
				const running = interaction.options.getBoolean('schedule');
				const cronNew = interaction.options.getString('new');
				const cronStart = interaction.options.getString('start');
				const cronEnd = interaction.options.getString('end');

				// If channel is not a text channel
				if (defaultChannel && !defaultChannel.isTextBased()) {
					return await interaction.editReply(
						'`default_channel` must be a text channel or bot has no access to it',
					);
				}
				else if (cronNew && !cronRegex.test(cronNew)) {
					return await interaction.editReply(
						'Invalid `new` CRON syntax. Visit https://crontab.guru/ for reference',
					);
				}
				else if (cronStart && !cronRegex.test(cronStart)) {
					return await interaction.editReply(
						'Invalid `start` CRON syntax. Visit https://crontab.guru/ for reference',
					);
				}
				else if (cronEnd && !cronRegex.test(cronEnd)) {
					return await interaction.editReply(
						'Invalid `end` CRON syntax. Visit https://crontab.guru/ for reference',
					);
				}

				// FIXME: Should be a better way to do this
				maxEntries ? (snmServer.maxEntries = maxEntries) : null;
				maxVotes ? (snmServer.maxVotes = maxVotes) : null;
				if (defaultChannel) {
					snmServer.defaultChannel = defaultChannel.id;
					// Certifies that we have all channels cached
					await interaction.client.guilds.fetch(
						interaction.guildId,
						true,
						true,
					);
					await interaction.client.channels.fetch(
						defaultChannel.id,
						true,
						true,
					);
				}

				if (running === true || running === false) {
					snmServer.schedule.running = running;
					await snmServer.toggleSchedule(running);
				}

				const SNMSchedule = SNMSchedulesArray.get(interaction.guildId);
				if (cronNew) {
					cronNew === 'default'
						? (snmServer.schedule.new = '0 8 * * 1')
						: (snmServer.schedule.new = cronNew);
					// Update cronJob if it exists
					SNMSchedule?.cronNew.setTime(
						new CronTime(snmServer.schedule.new, 'America/Sao_Paulo'),
					);
					// Cron is stopped after setTime, need to start again if needed
					snmServer.schedule.running ? SNMSchedule?.cronNew.start() : null;
				}
				if (cronStart) {
					cronStart === 'default'
						? (snmServer.schedule.start = '0 20 * * 5')
						: (snmServer.schedule.start = cronStart);
					// Update cronJob if it exists
					SNMSchedule?.cronStart.setTime(
						new CronTime(snmServer.schedule.start, 'America/Sao_Paulo'),
					);
					// Cron is stopped after setTime, need to start again if needed
					snmServer.schedule.running ? SNMSchedule?.cronStart.start() : null;
				}
				if (cronEnd) {
					cronEnd === 'default'
						? (snmServer.schedule.end = '0 20 * * 6')
						: (snmServer.schedule.end = cronEnd);
					// Update cronJob if it exists
					SNMSchedule?.cronEnd.setTime(
						new CronTime(snmServer.schedule.end, 'America/Sao_Paulo'),
					);
					// Cron is stopped after setTime, need to start again if needed
					snmServer.schedule.running ? SNMSchedule?.cronEnd.start() : null;
				}

				snmServer = await upsertSNMServer(snmServer);
			}

			// Print current values
			return interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle(`SNM options for ${interaction.guild.name}`)
						.addFields(
							{
								name: 'Max Entries',
								value: snmServer.maxEntries.toString(),
								inline: true,
							},
							{
								name: 'Max Votes',
								value: snmServer.maxVotes.toString(),
								inline: true,
							},
							{
								name: 'default_channel',
								value: `<#${snmServer.defaultChannel}>`,
								inline: false,
							},
							{
								name: 'schedule',
								value: `${snmServer.schedule.running}`,
								inline: false,
							},
							{ name: 'new', value: snmServer.schedule.new, inline: true },
							{
								name: 'start',
								value: snmServer.schedule.start,
								inline: true,
							},
							{ name: 'end', value: snmServer.schedule.end, inline: true },
							{
								name: 'Check for CRON Syntax here:',
								value: 'https://crontab.guru/',
								inline: false,
							},
						)
						.setThumbnail(interaction.guild.iconURL())
						.setColor(0x3498db),
				],
			});
		}
		catch (e) {
			reportError(e);
		}
	},
};
