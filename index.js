import { Collection } from 'discord.js';
import { client, configObj } from './src/config/index.js';
import { globalCommands, guildCommands, snmCommands } from './src/commands/index.js';
import { events } from './src/events/index.js';

client.commands = new Collection();

for (const command of globalCommands.concat(guildCommands, snmCommands)) {
  if ('data' in command && 'handler' in command) {
    client.commands.set(command.data.name, command);
  }
  else {
    console.log(
      `[WARNING] The ${command} command is missing a required "data" or "handler" property.`,
    );
  }
}

for (const event of events) {
  if (event.once) {
    client.once(event.name, (...args) => event.handler(...args));
  }
  else {
    client.on(event.name, (...args) => event.handler(...args));
  }
}

client.login(configObj.token);
