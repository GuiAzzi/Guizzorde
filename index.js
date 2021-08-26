import Discord from 'discord.js';
import Jimp from 'jimp/dist/index.js';
import OS from 'opensubtitles-api';
import torrentSearch from 'torrent-search-api';
import ytdl from 'ytdl-core';

import {
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    StreamType,
    VoiceConnectionStatus,
} from '@discordjs/voice';

import {
    getSNMServer,
    getSNMWeek,
    upsertSNMWeek,
} from './src/api/index.js';
import {
    Reminders,
    remindMeCommands,
    setReminders,
    slashMovie,
    snmCommands,
    snmEnable,
    SNMServerArray,
    SNMWeekArray,
    suggestion,
    toggleUserSubscription,
} from './src/commands/index.js';
// Guizzorde config object
import {
    client,
    configObj,
} from './src/config/index.js';
import { donato } from './src/stock/donato.js';
import {
    randomEmoji,
    reportError,
} from './src/util/index.js';

torrentSearch.enablePublicProviders();

// Base Memes Array
const memes = [
    {
        name: 'crab',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/557765021359276043/VghsxturtIjzwLuU.mp4'
    },
    {
        name: 'otter',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777058314257039421/they_dance.mp4'
    },
    {
        name: 'muchacho',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777058321970495488/wSsUAVNbJK1L1vlM.mp4'
    },
    {
        name: 'flamingo',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777058394158530580/Flamingo.mp4'
    },
    {
        name: 'wtf',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777064438904782848/jar1.png\nhttps://cdn.discordapp.com/attachments/168624317049995264/777064448804126720/jar2.mp4\nhttps://cdn.discordapp.com/attachments/168624317049995264/777064446652186630/jar3.png'
    },
    {
        name: 'vibing',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777065041685905408/lord_vibin.mp4'
    },
    {
        name: 'seal',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777065138011373609/Clap_seal.mp4'
    },
    {
        name: 'ham',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777065294538604554/good_kitty.mp4'
    },
    {
        name: 'butt',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777238203153252392/dash_360.mp4'
    },
    {
        name: 'AAaa',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/777238229161213962/v09044f70000bf3e6i3r587n6scu148g.mp4'
    },
    {
        name: 'shrek',
        meme: 'https://cdn.discordapp.com/attachments/724976219757609030/781492478141530133/Fuck_it_entire_Shrek_Movie.webm'
    },
    {
        name: 'taps',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/786313840769892352/Fastest_taps_in_the_west.mp4'
    },
    {
        name: 'pain',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/788167349014495232/Qlqkyivabf81lmv8-1.webm'
    },
    {
        name: 'motor',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/800566815666470922/Pelican_Motor_Mouth.mp4'
    },
    {
        name: 'animals are leaving',
        meme: 'https://cdn.discordapp.com/attachments/168624317049995264/809568621923008542/o9HmFOlY3-uvW4Ys.mp4'
    }
];

// Usable Memes Array
// This exists so we can remove rolled used memes, then recreate the array when all memes have been used
let usableMemes = [...memes];

// d.js Audio Player
const player = createAudioPlayer();
let connection;

// OpenSub Auth
const OpenSubtitles = new OS({
    useragent: configObj.OSCredentials[0],
    username: configObj.OSCredentials[1],
    password: configObj.OSCredentials[2],
    ssl: true
});

const searchSubtitle = async (title, lang = 'eng') => {
    const sub = await OpenSubtitles.search({
        sublanguageid: lang,
        query: title
    }).catch(e => reportError(e))

    if (Object.keys(sub).length !== 0) return sub;
    else return false;
}

// const aprillFoolsSeekMap = new Map();
// client.on('voiceStateUpdate', async (oldMember, newMember) => {
//     if (oldMember.member.user.bot) return;
//     try {
//         if (oldMember.channelID != newMember.channelID && newMember.channelID && newMember.channelID !== newMember.guild.afkChannelID) {
//             let aprillFoolsSeek = aprillFoolsSeekMap.get(oldMember.guild.id) || { time: 0, playing: false };
//             if (aprillFoolsSeek.playing && newMember.member.voice.channel.joinable) {
//                 return await newMember.member.voice.channel.join();
//             }
//             if (!aprillFoolsSeek.playing) {
//                 if (!newMember.member.voice.channel.joinable) return;
//                 aprillFoolsSeekMap.set(oldMember.guild.id, { playing: true });
//                 let connection = await oldMember.member.voice.channel.join();
//                 let dispatcher;
//                 setTimeout(() => {
//                     dispatcher = connection.play(`src/april-fools/rick.mp3`, { volume: 0.4, seek: aprillFoolsSeek.time < 203 ? aprillFoolsSeek.time : 0 });
//                 }, 1000)
//                 setTimeout(() => {
//                     dispatcher.pause();
//                     dispatcher.destroy();
//                     connection.disconnect();
//                     aprillFoolsSeekMap.set(oldMember.guild.id, { time: aprillFoolsSeek.time += dispatcher.totalStreamTime / 1000, playing: false });
//                 }, 7000);
//             }
//         }
//     }
//     catch (e) {
//         console.error(e);
//     }
// });

// Receive Slash Interaction
client.ws.on('INTERACTION_CREATE', async interaction => {

    const args = interaction.data.options;
    let logMessage = "";

    switch (interaction.data.name.toLowerCase()) {
        case 'help':
            const description = `/ping - Pings the API
/say - Make the bot say something
/snm - Show or export data from a SNM week
/snmEnable - Enables or disables SNM system for the server
/snmAdmin - Manage current SNM period
/snmConfig - Configure SNM options for the server
/snmTitle add - Add a movie to current SNM
/snmTitle remove - Remove a movie from current SNM
/snmRate - Add or change your current SNM rating
/snmVotes - Manage your current SNM votes
/torrent - Search for torrents on public trackers
/subtitle - Search for a subtitle file
/meme - 👀 ||do it||
/rato - Send a random tenista™ in chat, or make it say something!
/emoji - Convert your message into Discord's regional indicator emojis :abc:
/random - Randomly pick from one of the typed options
/poll - Start a poll that people can vote on typed options
/movie - Display info about a movie
/queridometro - Start a public rating on a server member`;

            // const embed = new Discord.MessageEmbed()
            //     // Set the title of the field
            //     .setTitle(`My Commands`)
            //     // Set the color of the embed
            //     .setColor('#4286f4')
            //     // Set the main content of the embed
            //     .setDescription(description);
            // let user = await client.users.fetch(interaction.member.user.id);
            // user.send(embed);

            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: description,
                        // embeds: [new Discord.MessageEmbed().setTitle('Test').setDescription('Dae')],
                        flags: 64
                    }
                }
            });
            break;
        case 'ping':
            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: `Pong! API Latency is ${Math.round(client.ws.ping)}ms`
                    }
                }
            });
            break;
        case 'say':
            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: args[0].value
                    }
                }
            });
            break;
        case 'snmenable':
            // Register SNM commands for this guild
            snmEnable.handler(interaction);
            break;
        case 'snm':
            // Sends rich embed with SNM infos
            snmCommands.snm.handler(interaction);
            break;
        case 'snmconfig':
            snmCommands.snmConfig.handler(interaction);
            break;
        case 'snmadmin':
            snmCommands.snmAdmin.handler(interaction);
            break;
        case 'snmtitle':
            snmCommands.snmTitle.handler(interaction);
            break;
        case 'snmrate':
            snmCommands.snmRate.handler(interaction);
            break;
        case 'snmvotes':
            snmCommands.snmVotes.handler(interaction);
            break;
        case 'torrent':
            // Search for a torrent on a list of providers
            try {
                // Array containing command-specific tips
                const tips = ['You can use this command via DM!', 'Specifying a year usually helps - Movie Name (2019)', 'Looking for a movie? Try the /movie command'];

                // Sends to-be-edited message
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            embeds: [new Discord.MessageEmbed().setTitle('Searching...').setColor(0x3498DB)]
                        }
                    }
                });

                // Searchs torrents
                await torrentSearch.search(['ThePirateBay', '1337x', 'Rarbg'], args[0].value, null, 3).then(async (result) => {
                    if (result.length === 0 || result[0].title === "No results returned")
                        await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                            data: {
                                embeds: [new Discord.MessageEmbed().setTitle(`Torrents Found: `).setDescription(`No torrent found 😔`).setColor(0x3498DB)]
                            }
                        });
                    else {
                        let torrentList = [];
                        for (let torrent of result) {
                            torrentList.push(`\n\n[${torrent.title.replace(/\[|\]/g, '')}]( ${torrent.magnet ? 'https://magnet.guiler.me?uri=' + encodeURIComponent(torrent.magnet) : torrent.desc} )\n${torrent.size} | ${torrent.seeds} seeders | ${torrent.provider}`);
                        }
                        let torrentEmbed = new Discord.MessageEmbed().setColor(0x3498DB);

                        // Check if message exceeds Discord's Max Characters (2048)
                        const arr = torrentList.join('').match(/.{1,2048}$/gms);

                        for (let i = 0; i < arr.length; i++) {
                            // If first pass - embed with title
                            if (i === 0) {
                                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                                    data: {
                                        embeds: [torrentEmbed.setTitle('Torrents Found: ').setDescription(arr[i])]
                                    }
                                });
                            }
                            else {
                                // If last pass - add footer
                                if (i === arr.length - 1) {
                                    if (interaction.guild_id)
                                        torrentEmbed.setFooter(`Tip: ${tips[Math.floor(Math.random() * tips.length)]}`);
                                    else
                                        torrentEmbed.setFooter(`Tip: ${tips[1]}`);
                                }
                                await client.api.webhooks(configObj.appId, interaction.token).post({
                                    data: {
                                        embeds: [torrentEmbed.setTitle('').setDescription(arr[i])]
                                    }
                                });
                            }
                        }
                    }
                });
            }
            catch (e) {
                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                    data: {
                        embeds: [new Discord.MessageEmbed().setTitle('Error').setDescription('An error has occured. Pelase report this bug.').setColor("RED")]
                    }
                });
                reportError(e);
            }
            break;
        case 'subtitle':
            let sub;
            let lang = args[1] ? args[1].value : 'eng';
            // Open Subtitle returns pt-br in an 'pb' object even with the pt-br code being pob.
            // We need this to search the object
            let objLang = 'en';

            // Sends to-be-edited message
            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        embeds: [new Discord.MessageEmbed().setTitle('Searching...').setColor(0x3498DB)]
                    }
                }
            });

            if (lang === 'eng') {
                sub = await searchSubtitle(args[0].value, lang).catch(e => reportError(e));
            }
            else if (lang === 'pob') {
                objLang = 'pb';
                sub = await searchSubtitle(args[0].value, lang).catch(e => reportError(e));
            }

            const subEmbed = new Discord.MessageEmbed()
                .setTitle(`Subtitle`)
                .setColor(0x3498DB)
                .setFooter(`Tip: You can paste the file name to try a perfect match!`)

            try {
                if (sub) {
                    logMessage = `Found ${sub[objLang].filename}`;
                    await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            embeds: [subEmbed.setDescription(`[${sub[objLang].filename}](${sub[objLang].url})\n${sub[objLang].lang} | ${sub[objLang].downloads} downloads | .${sub[objLang].format}`)]
                        }
                    });
                }
                else {
                    logMessage = `No sub found`;
                    await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                        data: {
                            embeds: [subEmbed.setDescription(`No subtitle found 😔`)]
                        }
                    });
                }
            }
            catch (e) {
                reportError(e);
                await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                    data: {
                        embeds: [subEmbed.setDescription(`An error has occured. Tell my master about it.`)]
                    }
                });
            }
            break;
        case 'meme':
            const memeName = args ? args[0] : null;

            // If no args = send random meme
            if (!args || memeName.name === '') {
                if (usableMemes.length === 0)
                    usableMemes = [...memes];
                let randomMemeIndex = Math.floor(Math.random() * usableMemes.length);
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: usableMemes.splice(randomMemeIndex, 1)[0].meme
                        }
                    }
                });
                break;
            }

            // If list is requested
            if (memeName.value.trim().toLowerCase() === 'list') {
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: `**Available Memes**\n\`\`\`${memes.map((meme) => meme.name).join('\n')}\`\`\``,
                            flags: 64
                        }
                    }
                })
            }

            else if (memeName) {
                // If a specific meme is requested
                const selectedMeme = memes.find((meme) => meme.name === memeName.value);
                if (selectedMeme) {
                    await client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: selectedMeme.meme
                            }
                        }
                    })
                }
                else {
                    await client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: 'No meme found.\nCheck out the `/meme` command.',
                                flags: 64
                            }
                        }
                    });
                }
            }
            break;
        case 'rato':
            // If theres a message
            if (args && args[0].value) {
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: '🐀🎾...:'
                        }
                    }
                });
                // Uses rato_plaquista as templete for text
                Jimp.read('src/rato/rato_plaquista4x.png').then(image => {
                    Jimp.loadFont('src/rato/font/rato_fontista.fnt').then(font => {
                        image.print(font, 240, 40, args[0].value, 530);
                        image.writeAsync('src/rato/rato_plaquistaEditado.jpg').then(async result => {
                            await client.api.webhooks(configObj.appId, interaction.token).messages('@original').delete();
                            client.channels.cache.get(interaction.channel_id).send({ files: ["src/rato/rato_plaquistaEditado.jpg"] });
                        });
                    });
                });
            }
            else {
                // Generates a message with a random 'rato tenista' image
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: `ei!! por favor pare!\nisto me deixa`
                        }
                    }
                });
                client.channels.cache.get(interaction.channel_id).send({ files: [`src/rato/tenistas/rato${Math.floor(Math.random() * 72)}.jpg`] });
            }

            break;
        case 'emoji':
            // Converts the inputed message to discord's regional emojis
            let sentence = "";
            for (let letter of args[0].value) {
                switch (letter) {
                    case " ":
                        sentence += "  ";
                        break;
                    case "0":
                        sentence += ":zero: ";
                        break;
                    case "1":
                        sentence += ":one: ";
                        break;
                    case "2":
                        sentence += ":two: ";
                        break;
                    case "3":
                        sentence += ":three: ";
                        break;
                    case "4":
                        sentence += ":four: ";
                        break;
                    case "5":
                        sentence += ":five: ";
                        break;
                    case "6":
                        sentence += ":six: ";
                        break;
                    case "7":
                        sentence += ":seven: ";
                        break;
                    case "8":
                        sentence += ":eight: ";
                        break;
                    case "9":
                        sentence += ":nine: ";
                        break;
                    case "!":
                        sentence += ":exclamation:";
                        break;
                    default:
                        let char = letter.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
                        if (/[$-/:-?{-~!@#"^_`\[\]]/.test(char)) {
                            sentence += char + " ";
                        }
                        else {
                            sentence += ":regional_indicator_" + char + ": ";
                        }
                        break;
                }
            }
            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: sentence
                    }
                }
            });
            break;
        case 'random':
            // TODO: Append 1), 2), 3) at the star of each option?

            let commaArgs = args[0].value.split(/,+/g);
            let winner = Math.floor(Math.random() * commaArgs.length);
            let embedColors = [0xFF0000, 0x00FF00, 0x0000FF, 0x808080, 0xFFFF00, 0x3498DB];
            let embedEmojis = ['🍀', '🤞', '🎲', '🎰', '🌠'];
            commaArgs[winner] = `\\> ${commaArgs[winner]} <`;
            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        embeds: [new Discord.MessageEmbed()
                            .setTitle(`${embedEmojis[Math.floor(Math.random() * embedEmojis.length)]} Random Picker ${embedEmojis[Math.floor(Math.random() * embedEmojis.length)]}`)
                            .setColor(embedColors[Math.floor(Math.random() * embedColors.length)])
                            .setDescription(commaArgs.join(`\n\n`))]
                    }
                }
            });
            break;
        case 'poll':
            // Get options
            const pollTitle = args[0].value;
            const pollOptions = args[1].value.split(/,+/g);
            // Get server custom emojis
            const serverEmojis = client.guilds.cache.get(interaction.guild_id)?.emojis.cache || { size: 0 };
            // Each arg will be assigned an emoji. Chosen emojis will be stored here.
            const pickedEmojis = [];

            for (let i = 0; i < pollOptions.length; i++) {
                if (serverEmojis.size !== 0) {
                    let rndEmoji = serverEmojis.random()
                    pickedEmojis.push(rndEmoji);
                    serverEmojis.delete(rndEmoji.id);
                    pollOptions[i] = `<:${pickedEmojis[i].name}:${pickedEmojis[i].id}> - ${pollOptions[i]}`;
                }
                else {
                    let rndEmoji = randomEmoji();
                    while (pickedEmojis.includes(rndEmoji))
                        rndEmoji = randomEmoji();
                    pickedEmojis.push(rndEmoji);
                    pollOptions[i] = `${pickedEmojis[i]} - ${pollOptions[i]}`;
                }
            }

            // Sends poll embed
            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: `Poll starting!`
                    }
                }
            });
            const msg = await client.channels.cache.get(interaction.channel_id).send(
                {
                    embeds: [
                        new Discord.MessageEmbed()
                            .setTitle(pollTitle)
                            .setColor(0x3498DB)
                            .setDescription(pollOptions.join(`\n\n`))
                            .setFooter('Vote by reacting with the corresponding emoji')
                    ]
                }
            );

            // Reacts to embed accordingly
            for (let i = 0; i < pollOptions.length; i++) {
                await msg.react(pickedEmojis[i]);
            };
            break;
        case 'toma':
            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: 'https://cdn.discordapp.com/emojis/487347201706819584.png'
                    }
                }
            });
            break;
        case 'movie':
            slashMovie.handler(interaction);
            break;
        case 'donato':
            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: donato[Math.floor(Math.random() * donato.length)]
                    }
                }
            });
            break;
        case 'queridometro':
            // Gets user by ID
            const ratingUser = await client.users.fetch(args[0].value).catch((e) => '');

            // Start interaction
            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: `Rating user`
                    }
                }
            });

            const queridometroEmojis = ['🐍', '🤮', '🙂', '☹', '💣', '♥', '💔', '🍌', '🪴'];

            // create queridometro embed
            const queridometroEmbed = new Discord.MessageEmbed()
                .setTitle(`Queridometro`)
                .setColor(0x3498DB)
                .setDescription(`Como você está se sentindo sobre <@!${args[0].value}> hoje?`)
                .setImage(ratingUser.avatarURL() || 'https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png')
                .setTimestamp(new Date().toJSON());

            // Send message and react accordingly
            let queridometroMsg = await client.channels.cache.get(interaction.channel_id).send({ embeds: [queridometroEmbed] });
            for (let i = 0; i < queridometroEmojis.length; i++) {
                await queridometroMsg.react(queridometroEmojis[i]);
            };
            break;
        case 'remindme':
            remindMeCommands.remindMe.handler(interaction);
            break;
        case 'remindme_list':
            remindMeCommands.remindMeList.handler(interaction);
            break;
        case 'suggestion':
            suggestion.handler(interaction);
            break;
    }

    // Logs stuff
    if (interaction.member)
        // If Slash Command was executed on a server
        console.log(`\n${interaction.member.user.username} executed '${interaction.data.name}'${args ? ` with "${JSON.stringify(args)}"` : ""} in ${interaction.guild_id}`);
    else
        // If Slash Command was executed via DM 
        console.log(`\n${interaction.user.username} executed '${interaction.data.name}'${args ? ` with "${JSON.stringify(args)}"` : ""} via DM`);

    logMessage ? console.log(logMessage) : null;
})

client.on('ready', async () => {
    // client.user.setAvatar(`src/config/avatar.jpg`);
    console.log(`${client.user.username} has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
    client.user.setActivity(`Beep boop`);

    // Register slash commands
    // try {
    //     // help
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'help',
    //             description: `Show the list of commands`,
    //         }
    //     });

    //     // ping
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'ping',
    //             description: `Show the bot's ping`,
    //         }
    //     });

    //     // say <message>
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'say',
    //             description: 'Make the bot say something',
    //             options: [{
    //                 type: 3,
    //                 name: 'message',
    //                 description: 'The message you want the bot to say',
    //                 required: true
    //             }]
    //         }
    //     });

    //     // torrent <query>
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'torrent',
    //             description: `Search for torrents on public trackers`,
    //             options: [
    //                 {
    //                     type: 3,
    //                     name: 'query',
    //                     required: true,
    //                     description: 'Your search text - Specifying a year usually helps - Movie Name (2019)',
    //                 }
    //             ]
    //         }
    //     });

    //     // subtitle <title> [language]
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'subtitle',
    //             description: `Search for a subtitle file`,
    //             options: [
    //                 {
    //                     type: 3,
    //                     name: 'title',
    //                     required: true,
    //                     description: 'Your search text (Filename is usually better)'
    //                 },
    //                 {
    //                     type: 3,
    //                     name: 'language',
    //                     description: 'The language to search for. Default is English',
    //                     choices: [
    //                         {
    //                             name: 'English',
    //                             value: 'eng'
    //                         },
    //                         {
    //                             name: 'Portuguese',
    //                             value: 'pob'
    //                         }
    //                     ]
    //                 }
    //             ]
    //         }
    //     });

    //     // meme [name] | [list]
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'meme',
    //             description: `Send a random meme in chat!`,
    //             options: [
    //                 {
    //                     type: 3,
    //                     name: 'name',
    //                     description: 'Choose a specific meme. Type \"list\" to see all available memes.',
    //                 }
    //             ]
    //         }
    //     });

    //     // rato [message]
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'rato',
    //             description: `Send a random tenista™ in chat!`,
    //             options: [
    //                 {
    //                     type: 3,
    //                     name: 'message',
    //                     description: 'Make rato tenista say something'
    //                 }
    //             ]
    //         }
    //     });

    //     // emoji <message>
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'emoji',
    //             description: `Convert your message into Discord's regional indicator emojis :abc:`,
    //             options: [
    //                 {
    //                     type: 3,
    //                     name: 'message',
    //                     required: true,
    //                     description: 'Text to be converted'
    //                 }
    //             ]
    //         }
    //     });

    //     // random <option1, option2, option3, ...>
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'random',
    //             description: `Pick from one of the options randomly`,
    //             options: [
    //                 {
    //                     type: 3,
    //                     name: 'options',
    //                     required: true,
    //                     description: 'Comma separated options. "option1, options2, option3, ..."'
    //                 }
    //             ]
    //         }
    //     });

    //     // poll <poll title> <Apple, Orange, Pineapple, ...>
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'poll',
    //             description: `Start a poll that people can vote on`,
    //             options: [
    //                 {
    //                     type: 3,
    //                     name: 'title',
    //                     required: true,
    //                     description: `What's the poll about?`
    //                 },
    //                 {
    //                     type: 3,
    //                     name: 'options',
    //                     required: true,
    //                     description: 'Comma separated options. "Apple, Orange, Pineapple, ..."'
    //                 }
    //             ]
    //         }
    //     });

    //     // toma
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'toma',
    //             description: `...toma...`
    //         }
    //     });

    //     // donato
    //     client.api.applications(configObj.appId).commands.post({
    //         data:
    //         {
    //             name: 'donato',
    //             description: `Send a Donato in the chat!`
    //         }
    //     });

    // // queridometro
    // client.api.applications(configObj.appId).commands.post({
    //     data: {
    //         name: 'queridometro',
    //         description: `Rate a member from this server`,
    //         options: [
    //             {
    //                 type: 6,
    //                 name: 'friend',
    //                 required: true,
    //                 description: 'Tag the user here'
    //             }
    //         ]
    //     }
    // });

    // }
    // catch (e) {
    //     reportError(e)
    // }

    try {
        // Setups Reminders
        await setReminders()
        console.log('Finished setting up Reminders');

        // Gets SNMServer objects
        for (const guild of client.guilds.cache) {
            const server = await getSNMServer(guild[0]);
            // Register CronJob's
            if (server.schedule?.running)
                await server.toggleSchedule(true);
            else
                await server.toggleSchedule(false);
        }

        // Gets latest SNMWeek's
        for (const server of SNMServerArray) {
            await getSNMWeek(server[0]);
        }

        console.log('Got SNM files');
    }
    catch (e) {
        reportError(e);
    }
});

client.on('error', (error) => {
    reportError(error);
});

client.on('messageReactionAdd', async (reaction, user) => {
    // Reactions from self, do nothing
    if (user.id === client.user.id) return;
    // Reaction on a SNMWeek voteMessage
    else if (SNMWeekArray.get(reaction.message.guild?.id)?.voteMessage?.messageId === reaction.message.id) {
        const snmWeek = SNMWeekArray.get(reaction.message.guild.id);
        const snmServer = SNMServerArray.get(reaction.message.guild.id);

        if (reaction.users.cache.find(userIndex => userIndex.id === user.id)) {
            // User added a new reaction ( = did not click an existing reaction), remove and do nothing
            if (reaction.count === 1) {
                await reaction.users.remove(user);
                console.log(`${user.username} - Invalid reaction on SNM`);
                return;
            }
            // If SNM not voting, remove and warn user
            else if (snmWeek.status !== "voting") {
                await reaction.users.remove(user);
                console.log(`${user.username} - Voting has ended`);
                return client.users.cache.get(user.id).send({ content: `Voting has ended` });
            }

            let userObject = snmWeek.users.find(userIndex => userIndex.userId === user.id);
            let movieTitleKey = snmWeek.emojisUsed.find(emoji => emoji.emoji === reaction.emoji.identifier || emoji.emoji === reaction.emoji.name).titleKey;

            // user is not on the list yet
            if (!userObject) {
                let movieTitle = snmWeek.users.find(user => user.movies.find(movie => movie.titleKey === movieTitleKey)).movies.find(movie => movie.titleKey === movieTitleKey).title;
                userObject = snmWeek.users[snmWeek.users.push({ userId: user.id, username: user.username, movies: [], votes: [movieTitleKey] }) - 1];
                await upsertSNMWeek(snmWeek);
                const voteGuild = client.guilds.cache.get(snmServer.guildId)
                const voteEmbed = new Discord.MessageEmbed()
                    .setTitle(`Vote Registered ✅`)
                    .setDescription(`${movieTitle}`)
                    .setFooter(`${voteGuild.name} | SNM ${snmWeek.week}`, voteGuild.iconURL())
                    .setColor(0x3498DB)
                    .setTimestamp(new Date().toJSON());
                client.users.cache.get(user.id).send({ embeds: [voteEmbed] });
                console.log(`Added user ${user.username} with their vote`);
            }
            // user already voted on that movie
            else if (userObject.votes.includes(movieTitleKey)) {
                client.users.cache.get(user.id).send({ content: `You already voted on that movie.` });
                console.log(`Duplicate vote`);
            }
            // valid vote
            else if (userObject.votes.length < snmServer.maxVotes) {
                let movieTitle = snmWeek.users.find(user => user.movies.find(movie => movie.titleKey === movieTitleKey)).movies.find(movie => movie.titleKey === movieTitleKey).title;
                userObject.votes.push(movieTitleKey);
                await upsertSNMWeek(snmWeek);
                const voteGuild = client.guilds.cache.get(snmServer.guildId)
                const voteEmbed = new Discord.MessageEmbed()
                    .setTitle(`Vote Registered ✅`)
                    .setDescription(`${movieTitle}`)
                    .setFooter(`${voteGuild.name} | SNM ${snmWeek.week}`, voteGuild.iconURL())
                    .setColor(0x3498DB)
                    .setTimestamp(new Date().toJSON());
                client.users.cache.get(user.id).send({ embeds: [voteEmbed] });
                console.log(`${user.username} voted. ${userObject.votes.length}/${snmServer.maxVotes}`);
            }
            // no votes left
            else {
                client.users.cache.get(user.id).send({ content: `You have no votes left.\n\`/snmVotes clear\` to clear your votes.` });
                console.log(`No votes left`);
            }

            await reaction.users.remove(user);
        }
    }
    // reaction on torrent second option
    // TODO: Redo this
    // else if (lastSnm.voteMessage && reaction.message.embeds.length > 0 && reaction.message.embeds[0]?.title === `SNM ${lastSnm.week} Second Option`) {
    //     // FIXME: Can't remove DM reactions anymore apparently
    //     // await reaction.users.remove(user);

    //     let oldDesc = torrentMessage.embeds[0].description

    //     torrentMessage.edit(new Discord.MessageEmbed().setTitle(`Torrent and Subtitle`).setColor(0x3498DB).setDescription(reaction.message.embeds[0].description))
    //         .then((msg) => {
    //             reaction.message.edit(new Discord.MessageEmbed().setTitle(`SNM ${lastSnm.week} Second Option`).setColor(0x3498DB).setDescription(oldDesc).setFooter(`click the reaction to swap to this`)).then(() => torrentMessage = msg);
    //         });
    //     console.log('Swapped torrent');
    // }
    // Reaction on queridometro
    else if (reaction.message.embeds && reaction.message.embeds[0]?.title === 'Queridometro') {
        console.log(`${user.username} reacted on queridometro`)
        // checks if user has a reaction on any other emoji
        reaction.message.reactions.cache.forEach(async (r) => {
            // if a previous reaction is found, remove it
            if (r !== reaction && r.users.cache.find(userIndex => userIndex.id === user.id)) {
                try {
                    await r.users.remove(user);
                    console.log(`Removed ${user.username}'s previous reaction from queridometro`)
                }
                catch (e) {
                    console.log(`Could not remove ${user.username}'s reaction from queridometro`)
                }
            }
        })
    }
    // Reaction on a *not fired* Reminder inside Reminders.idList
    else if (Reminders.idList.has(reaction.message.id)) {
        if (reaction.emoji.name === '🔔') {
            // Subscribe User
            toggleUserSubscription(Reminders.idList.get(reaction.message.id), user, "add");
        }
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    // Reactions from self, do nothing
    if (user.id === client.user.id) return;
    // Reaction on a *not fired* Reminder inside Reminders.idList
    else if (Reminders.idList.has(reaction.message.id)) {
        if (reaction.emoji.name === '🔔') {
            // Unsubscribe User
            toggleUserSubscription(Reminders.idList.get(reaction.message.id), user, "remove");
        }
    }
});

client.on('messageCreate', async message => {
    // If message is from another bot, ignore
    if (message.author.bot && message.author.id !== client.user.id) return;

    // If message does not contain prefix, ignore
    if (message.content.indexOf(configObj.prefix) !== 0) return;

    // If message is *all* prefix, ignore (ex "!!!!!!!!!")
    if (/^!{2,}.*$/.test(message.content.replace(' ', ''))) return;

    // If message is just the prefix, ignore (ex: "!")
    if (message.content === "!") return;

    // Separate message from prefix
    // "clean" means the message does not use discord hashes for channels and mentions. e.g. <!@numbers>
    const args = message.content.slice(configObj.prefix.length).trim().split(/ +/g);
    const cleanArgs = message.cleanContent.slice(configObj.prefix.length).trim().split(/ +/g);

    const command = args.shift().toLowerCase();
    const cleanCommand = cleanArgs.shift().toLowerCase();

    // To get the "message" itself we join the `args` back into a string with spaces: 
    const messageText = args.join(" ");
    const cleanMessageText = cleanArgs.join(" ");

    let logMessage = "";

    switch (command) {
        case 'setavatar': {
            if (message.author.id !== configObj.ownerId) return;
            const avatarSrc = [...message.attachments.values()][0].url;
            client.user.setAvatar(avatarSrc);
            break;
        }
        case 'setactivity': {
            if (message.author.id !== configObj.ownerId) return;
            client.user.setActivity(cleanMessageText);
            break;
        }
        case 'say':
            await message.author.send({ content: '**⚠ This command will soon be completely replaced with `/say` ⚠**' });
            message.delete().catch(O_o => { });
            // Removes any command from the text, so the bot doesn't execute !snmStart or loops !say for example
            const sendMessage = messageText.replace(/!\w+/gim, '');
            if (sendMessage)
                message.channel.send({ embeds: [sendMessage] });
            else
                message.author.send({ content: `You forgot to tell me what to say.\nUsage: \`!say <something>\`` });
            break;
        case 'changesub':
            // can only be done by owner
            if (message.author.id != configObj.ownerId) {
                logMessage = "Author is not owner"
                break;
            }
            if (args.length === 0) {
                message.channel.send({ content: `Usage: \`!changeSub <channel id> <torrent message id> <new sub download link>\`` });
                logMessage = "Wrong usage"
                break;
            }
            let torrentMsgGet = await client.channels.cache.get(args[0]).messages.fetch(args[1]);
            // If message is the old torrent format (only torrent and sub)
            if (torrentMsgGet.embeds[0].description) {
                torrentMsgGet.edit(torrentMsgGet.embeds[0].setDescription(
                    torrentMsgGet.embeds[0].description.replace(/\[Subtitle]\(.+\)|No subtitle found/g, `[Subtitle](${args[2]})`)
                ));
            }
            // Else, if new format (full /movie details)
            else {
                const torrentFieldIndex = torrentMsgGet.embeds[0].fields.findIndex(field => field.name === 'Torrent');
                torrentMsgGet.embeds[0].fields[torrentFieldIndex].value = torrentMsgGet.embeds[0].fields[torrentFieldIndex].value.replace(/\[Subtitle]\(.+\)|No subtitle found/g, `[Subtitle](${args[2]})`);
                torrentMsgGet.edit(torrentMsgGet.embeds[0]);
            }

            logMessage = `Changed sub from ${args[0]} of channel ${args[1]} with ${args[2]}`;
            break;
        // case 'changetorrent':
        //     // TODO: below is a copy-paste of changeSub for reference
        //     // can only be done by owner
        //     if (message.author.id != configObj.ownerId) {
        //         logMessage = "Author is not owner"
        //         break;
        //     }
        //     if (args.length === 0) {
        //         message.channel.send(`Usage: \`!changeSub <channel id> <torrent message id> <new sub download link>\``);
        //         logMessage = "Wrong usage"
        //         break;
        //     }
        //     let torrentMsgGet = await client.channels.cache.get(args[0]).messages.fetch(args[1]);
        //     // If message is the old torrent format (only torrent and sub)
        //     if (torrentMsgGet.embeds[0].description) {
        //         torrentMsgGet.edit(torrentMsgGet.embeds[0].setDescription(
        //             torrentMsgGet.embeds[0].description.replace(/\[Subtitle]\(.+\)|No subtitle found/g, `[Subtitle](${args[2]})`)
        //         ));
        //     }
        //     // Else, if new format (full /movie details)
        //     else {
        //         const torrentFieldIndex = torrentMsgGet.embeds[0].fields.findIndex(field => field.name === 'Torrent');
        //         torrentMsgGet.embeds[0].fields[torrentFieldIndex].value = torrentMsgGet.embeds[0].fields[torrentFieldIndex].value.replace(/\[Subtitle]\(.+\)|No subtitle found/g, `[Subtitle](${args[2]})`);
        //         torrentMsgGet.edit(torrentMsgGet.embeds[0]);
        //     }

        //     logMessage = `Changed sub from ${args[0]} of channel ${args[1]} with ${args[2]}`;
        //     break;
        case 'play':
            if (message.author.id !== configObj.ownerId) {
                message.channel.send({ content: 'Função bloqueada pra você. Desbloqueie com 20 dola na mão do pai.' });
                logMessage = "not owner";
                break;
            }
            if (!message.member) {
                message.author.send({ content: 'You must send this in a server :(' });
                logMessage = 'message not sent in server';
                break;
            }
            if (!message.member.voice.channel) {
                message.channel.send({ content: 'You must be connected to a channel' });
                logMessage = 'not connected to a channel';
                break;
            }

            const channel = message.member.voice.channel;
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guildId,
                adapterCreator: channel.guild.voiceAdapterCreator
            })

            // Make sure the connection is ready before processing the user's request
            try {
                await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
            } catch (error) {
                console.warn(error);
                message.channel.send({ content: 'Failed to join voice channel within 20 seconds, please try again later!' });
                return;
            }

            connection.subscribe(player);

            let resource;

            if (messageText === 'countdown')
                resource = createAudioResource(`src/commands/Sunday Night Movie/sounds/countdown${Math.floor(Math.random() * 4) + 1}.mp3`, { inputType: StreamType.Arbitrary, inlineVolume: 0.7 });
            else if (messageText === 'countdown1')
                resource = createAudioResource(`src/commands/Sunday Night Movie/sounds/countdown1.mp3`, { inputType: StreamType.Arbitrary, inlineVolume: 0.7 });
            else if (messageText === 'countdown2')
                resource = createAudioResource(`src/commands/Sunday Night Movie/sounds/countdown2.mp3`, { inputType: StreamType.Arbitrary, inlineVolume: 0.7 });
            else if (messageText === 'countdown3')
                resource = createAudioResource(`src/commands/Sunday Night Movie/sounds/countdown3.mp3`, { inputType: StreamType.Arbitrary, inlineVolume: 0.7 });
            else if (messageText === 'countdown4')
                resource = createAudioResource(`src/commands/Sunday Night Movie/sounds/countdown4.mp3`, { inputType: StreamType.Arbitrary, inlineVolume: 0.7 });
            else
                resource = createAudioResource(ytdl(messageText, { filter: 'audioonly' }), { inputType: StreamType.Arbitrary, inlineVolume: 0.15 });

            player.play(resource);

            // entersState(player, AudioPlayerStatus.Playing, 5e3);

            player.on('finish', () => {
                connection.disconnect();
            });
            break;
        case 'stop':
            player.stop();
            connection.destroy();
            break;
        default:
            break;
    }

    // Logs stuff
    console.log(`\n${message.author.username} executed '${command}' ${args != "" ? `with "${messageText}"` : ""}`);
    logMessage ? console.log(logMessage) : null;
});

client.login(configObj.token);
