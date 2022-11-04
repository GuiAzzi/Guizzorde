import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	Routes,
	REST,
} from 'discord.js';

import {
	getSNMServer,
	SNMServer,
	upsertSNMServer,
} from '../../guild/Sunday Night Movie/index.js';
import { snmCommands } from '../../index.js';
import { reportError } from '../../../util/index.js';
import { configObj } from '../../../config/index.js';

export const snmEnableCommand = {
	data: new SlashCommandBuilder()
		.setName('snmenable')
		.setDescription('Enables or disables Sunday Night Movie')
		.addBooleanOption((option) =>
			option
				.setName('option')
				.setDescription('True to enable | False to disable')
				.setRequired(true),
		)
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		try {
			await interaction.deferReply({ ephemeral: true });

			const option = interaction.options.getBoolean('option');

			if (option === true) {
				await interaction.editReply(
					'SNM should be enabled shortly for this server! 🌵',
				);
			}
			else if (option === false) {
				await interaction.editReply(
					'SNM should be disabled shortly for this server. ✌',
				);
			}

			let snmServer = await getSNMServer(interaction.guildId);

			// No SNMServer for this Server
			if (!snmServer.guildId) {
				snmServer = new SNMServer({
					guildId: interaction.guildId,
					enabled: true,
					defaultChannel: interaction.channelId,
					maxEntries: 1,
					maxVotes: 2,
					schedule: {
						running: false,
						new: '0 8 * * 1',
						start: '0 20 * * 5',
						end: '0 20 * * 6',
					},
				});
			}
			// Server exists in the Database and is being disabled -> Stop any CronJob's
			else if (option === false) {
				snmServer.schedule.running = option;
				await snmServer.toggleSchedule(option);
			}
			snmServer.enabled = option;
			await upsertSNMServer(snmServer);
			await toggleSNM(interaction.guildId, option);
		}
		catch (e) {
			reportError(e, interaction);
		}
	},
};

/**
 * Toggles SNM commands for specified server
 * @param {string} guildId - The Server ID to enable SNM
 * @param {boolean} enabled - If commands should be registered or deregistered
 */
async function toggleSNM(guildId, enabled) {
	try {
		const rest = new REST({ version: '10' }).setToken(configObj.token);

		if (enabled) {
			const commands = snmCommands.map((command) => command.data.toJSON());
			await rest.put(
				Routes.applicationGuildCommands(configObj.appId, guildId),
				{ body: commands },
			);
		}
		else if (!enabled) {
			const guildCommands = await rest.get(
				Routes.applicationGuildCommands(configObj.appId, guildId),
			);

			const snmCommandsNames = snmCommands.map(
				(snmCommand) => snmCommand.data.name,
			);
			const registeredSnmCommands = guildCommands.filter((gCommand) =>
				snmCommandsNames.includes(gCommand.name),
			);

			for (const registeredSnmCommand of registeredSnmCommands) {
				await rest.delete(
					Routes.applicationGuildCommand(
						configObj.appId,
						guildId,
						registeredSnmCommand.id,
					),
				);
			}
		}
	}
	catch (e) {
		console.log(`Error enabling SNM for ${guildId}`);
		reportError(e);
	}
}
