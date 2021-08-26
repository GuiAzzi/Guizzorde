import Discord from 'discord.js';

import { Client } from '@notionhq/client';

import {
    client,
    configObj,
} from '../../config/index.js';
import { reportError } from '../../util/index.js';
import {
    deregister,
    GuizzordeCommand,
    register,
} from '../index.js';

export const suggestion = new GuizzordeCommand({
    command: {
        name: 'suggestion',
        description: 'Make a feature suggestion',
        options: [
            {
                type: 3,
                name: 'text',
                required: true,
                description: 'Write your suggestion here'
            }
        ]
    },
    register: register,
    deregister: deregister,
    handler: async function (interaction) {
        try {
            const text = interaction.data.options?.find((arg => arg.name === 'text'))?.value;

            // deferred response | type 5
            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 5,
                    data: {
                        flags: 64
                    }
                }
            });

            const notion = new Client({ auth: configObj.notionToken });
            const databaseId = configObj.notionDatabaseId;

            const response = await notion.pages.create({
                parent: { database_id: databaseId },
                properties: {
                    title: {
                        title: [{ text: { content: text } }]
                    },
                    Status: {
                        type: 'select',
                        select: { name: 'Suggestions' }
                    },
                },
                children: [{
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        text: [{ text: { content: `Suggestion sent by ${interaction.member?.user.username || interaction.user.username}` } }]
                    }
                }]
            })

            if (response) {
                return await client.api.webhooks(configObj.appId, interaction.token).post({
                    data: {
                        content: `Suggestion saved. Thank you! 😇\nTrack progress at <https://guizzo.notion.site/Guizzorde-8532e366c71d4ce993bfa090495cde1f>`,
                        flags: 64
                    }
                });
            }
        }
        catch (e) {
            reportError(e);

            const embed = new Discord.MessageEmbed()
                .setTitle('Error')
                .setDescription(e)
                .setColor('RED')
                .setFooter('Report this to my owner if you can!')

            return await client.api.webhooks(configObj.appId, interaction.token).post({
                data: {
                    embeds: [embed],
                    flags: 64
                }
            });
        }
    }
});