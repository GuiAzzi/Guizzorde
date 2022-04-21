import { CommandInteraction } from 'discord.js';

import { client } from '../../config/Config.class.js';
import { reportError } from '../../util/index.js';
import {
    deregister,
    GuizzordeCommand,
    register,
} from '../index.js';

export const activity = new GuizzordeCommand({
    command: {
        name: 'activity',
        description: 'Start an activity on this server',
        options: [
            {
                type: 3,
                name: 'name',
                description: 'The activity name',
                required: true,
                // Choices got from here https://github.com/RemyK888/discord-together/blob/main/src/DiscordTogether.js
                choices: [
                    {
                        name: 'Youtube',
                        value: '880218394199220334'
                    },
                    {
                        name: 'Poker',
                        value: '755827207812677713'
                    },
                    {
                        name: 'Betrayal',
                        value: '773336526917861400'
                    },
                    {
                        name: 'Fishing',
                        value: '814288819477020702'
                    },
                    {
                        name: 'Chess',
                        value: '832012774040141894'
                    },
                    {
                        name: 'Letter Tile',
                        value: '879863686565621790'
                    },
                    {
                        name: 'Wordsnack',
                        value: '879863976006127627'
                    },
                    {
                        name: 'Awkword',
                        value: '879863881349087252'
                    },
                    {
                        name: 'Spellcast',
                        value: '852509694341283871'
                    },
                    {
                        name: 'Checkers',
                        value: '832013003968348200'
                    },
                    {
                        name: 'Puttparty',
                        value: '763133495793942528'
                    },
                    {
                        name: 'Sketchheads',
                        value: '902271654783242291'
                    },
                    {
                        name: 'Ocho',
                        value: '832025144389533716'
                    }
                ]
            },
            {
                type: 7,
                name: 'voice_channel',
                required: true,
                description: 'Where will the activity start in | Must be a voice channel'
            },
        ],
    },
    register: register,
    deregister: deregister,
    /** @param {CommandInteraction} interaction */
    handler: async function (interaction) {
        await interaction.deferReply({ephemeral: true});
        try {
            const actId = interaction.options.getString('name')
            const voiceChannel = interaction.options.getChannel('voice_channel');

            if (!voiceChannel.isVoice())
                return interaction.editReply({content: `Channel must be a Voice Channel`});

            const actRes = await client.api.channels(voiceChannel.id).invites.post({
                data: {
                    max_age: 86400,
                    max_uses: 0,
                    target_application_id: actId,
                    target_type: 2,
                    temporary: false,
                    validate: null,
                },
                headers: {
                    Authorization: `Bot ${client.token}`,
                    'Content-Type': 'application/json'
                }
            });

            return interaction.editReply({content: `https://discord.com/invite/${actRes.code}`});
        }
        catch (e) {
            reportError(e, interaction);
        }
    }
});