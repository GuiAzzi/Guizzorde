import * as chrono from 'chrono-node';
import { MessageEmbed } from 'discord.js';

import {
    client,
    configObj,
} from '../../config/index.js';
import { reportError } from '../../util/index.js';
import {
    _slashCommand,
    deregister,
    GuizzordeCommand,
    register,
} from '../index.js';

export const remindMeCommands = {
    /** @type {GuizzordeCommand} remindMe - /remindMe <note> <date> [private] */
    remindMe: new GuizzordeCommand({
        command: new _slashCommand({
            name: 'remindme',
            description: `Set a new reminder! Reminders created via DM's are always private.`,
            options: [
                {
                    type: 3,
                    name: 'note',
                    required: true,
                    description: 'What would you like to be reminded of?'
                },
                {
                    type: 3,
                    name: 'date',
                    required: true,
                    description: 'When would you want to be reminded? | Ex: "Tomorrow", "In five days", "17 August 2013"'
                },
                {
                    type: 5,
                    name: 'private',
                    description: 'Whether other people can see and subscribe to this reminder'
                }
            ]
        }),
        register: register,
        deregister: deregister,
        handler: async function (interaction) {
            try {
                const note = interaction.data.options?.find((arg => arg.name === 'note'))?.value;
                const date = interaction.data.options?.find((arg => arg.name === 'date'))?.value;
                const privateFlag = interaction.data.options?.find((arg => arg.name === 'private'))?.value ? 64 : null;

                // deferred response | type 5
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 5,
                        data: {
                            flags: privateFlag
                        }
                    }
                });

                // Try to parse date in english first then in pt
                const parsedDate = chrono.parseDate(date) || chrono.pt.parseDate(date);

                // If failed to parse
                if (!parsedDate) {
                    const _error = `Couldn't understand \`time\` input`;
                    await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            embeds: [new MessageEmbed().setTitle(`New Reminder`).setDescription(_error).setColor("RED")],
                            flags: privateFlag
                        }
                    });
                }
                else {
                    // TODO:
                }

            }
            catch (e) {
                reportError(e)
            }
        }
    })
}