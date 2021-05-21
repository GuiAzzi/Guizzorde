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
            name: 'remindMe',
            description: `Set a new reminder! Reminders created via DM's are always private.`,
            options: [
                {
                    type: 3,
                    name: 'note',
                    description: 'What would you like to be reminded of?'
                },
                {
                    type: 3,
                    name: 'date',
                    description: 'When would you want to be reminded? | Uses CRON format https://crontab.guru/'
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
                const _private = interaction.data.options?.find((arg => arg.name === 'private'))?.value;

                // deferred response | type 5
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 5,
                        flags: _private ? 64 : null
                    }
                });


            }
            catch (e) {
                reportError(e)
            }
        }
    })
}