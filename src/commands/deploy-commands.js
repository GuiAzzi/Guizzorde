import { REST, Routes } from 'discord.js';
import { configObj } from '../config/index.js';
import reader from 'readline-sync';
import { globalCommands, guildCommands } from '../commands/index.js';

const guildId = reader.question('Guild ID (empty for global): ');

const rest = new REST({ version: '10' }).setToken(configObj.token);

// Register Global Commands
(async () => {
	try {
		const commands = globalCommands.map((command) => command.data.toJSON());

		console.log(
			`Started refreshing ${commands.length} GLOBAL application (/) commands.`,
		);

		const data = await rest.put(Routes.applicationCommands(configObj.appId), {
			body: commands,
		});

		console.log(
			`Successfully reloaded ${data.length} GLOBAL application (/) commands.`,
		);
	}
	catch (e) {
		console.error(e);
	}
})();

// Register Guild Commands
(async () => {
	if (guildId) {
		const commands = guildCommands.map((command) => command.data.toJSON());

		try {
			console.log(
				`Started refreshing ${commands.length} GUILD application (/) commands in ${guildId}.`,
			);

			const data = await rest.put(
				Routes.applicationGuildCommands(configObj.appId, guildId),
				{ body: commands },
			);

			console.log(
				`Successfully reloaded ${data.length} GUILD application (/) commands in ${guildId}.`,
			);
		}
		catch (e) {
			console.error(e);
		}
	}
})();
