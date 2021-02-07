const Discord = require('discord.js');
const cron = require('cron');
const Jimp = require('jimp/dist');
const torrentSearch = require('torrent-search-api');
const OS = require('opensubtitles-api');
const mongodb = require('mongodb');
const fs = require('fs');
const randomEmoji = require('./src/random-emoji.js');
const ytdl = require('ytdl-core');
const JustWatch = require('justwatch-api');
const { jwGenresBR, jwGenresEN, jwProvidersBR, jwProvidersEN } = require('./src/jw/jw');
const { donato } = require('./src/stock/donato');

torrentSearch.enablePublicProviders();

// config.json - for running locally
const config = fs.existsSync('./config.json') ? require('./config.json') : null;

// Bot token
const token = process.env.TOKEN || config.token;
// OwnerID
const ownerId = process.env.OWNER_ID || config.ownerId;
// Message prefix
const prefix = process.env.PREFIX || config.prefix;
// MongoDb URI
const uri = process.env.MONGODB_URI || config.mongodb;
// MongoDb collection | snm = production, snmTest = dev
const collection = config ? config.mongoCollection : "snm";
// Heroku MongoDb name
const herokuDb = 'heroku_6zd3qncp';
// the last snm collection
let lastSnm;
// torrentMessage id - short lived, should not be saved to database - used to swap to second option
let torrentMessage;

// SNM CONFIGS
// Number of entries allowed by each user
const NUMBEROFENTRIES = 1;
// Number of votes allowed by each user
const NUMBEROFVOTES = 2;
// Sets to local config channel else sets to #Top Server BR's snm channel
const SNMCHANNEL = config ? config.testSNMChannel : '556546153689120793';
// !snmNew
const snmNewJob = new cron.CronJob('0 8 * * 1', () => {
    client.channels.cache.get(SNMCHANNEL).send('!snmNew');
}, null, false, 'America/Sao_Paulo');
// !snmStart
const snmStartJob = new cron.CronJob('0 20 * * 5', () => {
    client.channels.cache.get(SNMCHANNEL).send('!snmStart');
}, null, false, 'America/Sao_Paulo');
// !snmEnd
const snmEndJob = new cron.CronJob('0 20 * * 6', () => {
    client.channels.cache.get(SNMCHANNEL).send('!snmEnd');
}, null, false, 'America/Sao_Paulo');
// Starts or stops SNM Scheduled jobs
const snmToggleJobs = (start) => {
    if (start) {
        !snmNewJob.running ? snmNewJob.start() : null;
        !snmStartJob.running ? snmStartJob.start() : null;
        !snmEndJob.running ? snmEndJob.start() : null;
    }
    else {
        snmNewJob.running ? snmNewJob.stop() : null;
        snmStartJob.running ? snmStartJob.stop() : null;
        snmEndJob.running ? snmEndJob.stop() : null;
    }
}
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
    }
];

// Usable Memes Array
// This exists so we can remove rolled used memes, then recreate the array when all memes have been used
let usableMemes = [...memes];

// Channel connection var
let connection = null;
let dispatcher = null;

// OS Config
const OSCredentials = config ? config.OSCredentials : process.env.OSCREDENTIALS.split(',');
const OpenSubtitles = new OS({
    useragent: OSCredentials[0],
    username: OSCredentials[1],
    password: OSCredentials[2],
    ssl: true
});

const client = new Discord.Client({ partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION'] });

/**
 * Saves the snmFile from snm variable
 * @param {function} callback - A function to be called after saving the file
 */
function saveSnmFile(callback) {
    mongodb.MongoClient.connect(uri, { useNewUrlParser: true }, (err, mongoClient) => {
        if (err) {
            console.error(err);
            throw err;
        }

        mongoClient.db(herokuDb).collection(collection).replaceOne({ week: lastSnm.week }, lastSnm, (err, result) => {
            if (err) {
                console.error(err);
                throw err;
            }

            lastSnm = result.ops[0];
            callback();
            mongoClient.close();
        });
    });
}

function insertNewSnm(newSnm, callback) {
    mongodb.MongoClient.connect(uri, { useNewUrlParser: true }, (err, mongoClient) => {
        if (err) {
            console.error(err);
            throw err;
        }

        mongoClient.db(herokuDb).collection(collection).insertOne(newSnm, (err, result) => {
            if (err) {
                console.error(err);
                throw err;
            }

            lastSnm = result.ops[0];
            callback();
            mongoClient.close();
        });
    });
}

function snmEmbed() {
    let description = `Status: **${lastSnm.paused ? 'paused' : lastSnm.status}**\n\n`;
    let footer = "";
    let printArray = [];

    // If status is finished, prints winner;
    if (lastSnm.status === "finished" && lastSnm.winner.titleKey)
        description += `Winner: **${lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === lastSnm.winner.titleKey)).movies.find(movie => movie.titleKey === lastSnm.winner.titleKey).title}**\n\n`;

    // Builds list ordered by titleKey
    for (let userIndex in lastSnm.users) {
        for (let movieIndex in lastSnm.users[userIndex].movies)
            printArray[lastSnm.users[userIndex].movies[movieIndex].titleKey - 1] = [`${lastSnm.users[userIndex].movies[movieIndex].titleKey}) ${lastSnm.users[userIndex].movies[movieIndex].title}\n`]
    }

    if (printArray.length === 0)
        printArray.push(`No movies requested yet 😢\n`);

    if (lastSnm.status === "ongoing")
        footer = `!snmAdd <movie name> to add`;
    else if (lastSnm.status === "finished")
        footer = `!snmRate <text> to leave a rating`;
    else if (lastSnm.status === "voting")
        footer = `Votings are open! Go vote 🔥`;

    let embed = new Discord.MessageEmbed()
        // Set the title of the field
        .setTitle(`🌟 Sunday Night Movie ${lastSnm.week} 🌟`)
        // Set the color of the embed
        .setColor(0x3498DB)
        // Set the main content of the embed
        .setDescription(description + printArray.join(""))
        // Set the footer text
        .setFooter(footer)
    // Returns the embed
    return embed;
}

async function createTorrentEmbed(winnerTitle, guildOwner) {

    // Gets torrent number and creates embed description
    createDesc = (i, subUrl) => `[${torrentList[i].title}](${torrentList[i].magnet ? 'https://magnet.guiler.me?uri=' + encodeURIComponent(torrentList[i].magnet) : torrentList[i].desc})\n${torrentList[i].size} | ${torrentList[i].seeds} seeders | ${torrentList[i].provider} ${subUrl['pb'] ? ` | [Subtitle](${subUrl['pb'].url})` : null}`;

    // Searchs torrents
    let torrentList = await torrentSearch.search(['Rarbg'], winnerTitle + " 1080", 'Movies', 2).catch((e) => {
        reportError(e);
    });

    let description = `\n`;

    if (torrentList.length === 0 || torrentList[0].title === "No results returned")
        return null;
    else {
        // Search subtitle
        // Main torrent
        const subUrl = await searchSubtitle(torrentList[0].title, 'pob').catch((e) => reportError(e));
        // Alt torrent
        const altUrl = await searchSubtitle(torrentList[1].title, 'pob').catch((e) => reportError(e));

        description += await createDesc(0, subUrl);
        // Sends second torrent option to guildOwner
        await guildOwner.send(new Discord.MessageEmbed()
            .setTitle(`SNM ${lastSnm.week} Second Option`)
            .setColor(0x3498DB)
            .setDescription(await createDesc(1, altUrl))
            .setFooter(`click the reaction to swap to this`)).then((msg) => msg.react('🔄'));
    }

    return new Discord.MessageEmbed().setTitle(`Torrent and Subtitle`).setColor(0x3498DB).setDescription(description);
}

const reportError = async (error) => {
    console.error(error);
    let owner = await client.users.fetch(ownerId);
    owner.send(error);
}

const searchSubtitle = async (title, lang = 'eng') => {
    const sub = await OpenSubtitles.search({
        sublanguageid: lang,
        query: title
    }).catch(e => reportError(e))

    if (Object.keys(sub).length !== 0) return sub;
    else return false;
}

// Receive Slash Interaction
client.ws.on('INTERACTION_CREATE', async interaction => {
    const args = interaction.data.options;
    let logMessage = "";

    switch (interaction.data.name.toLowerCase()) {
        case 'help':
            const description = `/ping - Pings the API
/say <message> - Make the bot say something
/snm [week number] [export number] - Show or export SNM
/snmAdmin <new|start|end|pause> - Manage current SNM
/snmTitle add <title> - Add a movie to current SNM
/snmTitle remove [title] - Remove a movie from current SNM
/snmRate <text> - Add or change your current SNM rating
/snmVotes <Show | Clear> - Manage your current SNM votes
/torrent <query> - Search for torrents on public trackers
/subtitle <title> [language] - Search for a subtitle file
/meme [meme name | list] - 👀 ||do it||
/rato [message] - Send a random tenista™ in chat, or make it say something!
/emoji <message> - Convert your message into Discord's regional indicator emojis :abc:
/random <option1, option2, option3, ...> - Randomly pick from one of the options
/poll <poll title>, <Apple, Orange, Pineapple, ...> - Start a poll that people can vote on
/movie <movie title> [language] - Display info about a movie
**<> means a parameter is mandatory and [] is optional**`;

            // const embed = new Discord.MessageEmbed()
            //     // Set the title of the field
            //     .setTitle(`My Commands`)
            //     // Set the color of the embed
            //     .setColor('#4286f4')
            //     // Set the main content of the embed
            //     .setDescription(description);
            // let user = await client.users.fetch(interaction.member.user.id);
            // user.send(embed);

            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 3,
                    data: {
                        content: description,
                        embeds: [new Discord.MessageEmbed().setTitle('Test').setDescription('Dae')],
                        flags: 1 << 6
                }
                }
            });
            break;
        case 'ping':
            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: `Pong! API Latency is ${Math.round(client.ws.ping)}ms`
                    }
                }
            });
            break;
        case 'say':
            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 3,
                    data: {
                        content: args[0].value
                    }
                }
            });
            break;
        case 'snm':
            // Sends rich embed with SNM infos
            // If no week was specified or if specified week is current one
            if (!args || args[0].value === lastSnm.week && lastSnm.status != "finished") {
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: '',
                            embeds: [snmEmbed()]
                        }
                    }
                });
                break;
            }
            else if (args[0].value > lastSnm.week || args[0].value <= 0) {
                // User entered a week bigger than current one or <= 0
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: `Thats not a valid week`
                        }
                    }
                });
                logMessage = `Week ${args[0].value} is invalid`;
                break;
            }
            else {
                // FIXME: Integrate followup message
                // If a week was specified, show that SNM summary
                let m = await client.channels.cache.get(interaction.channel_id).send("Checking...");
                mongodb.MongoClient.connect(uri, { useNewUrlParser: true }, (err, mongoClient) => {
                    if (err) {
                        console.error(err);
                        throw err;
                    }

                    mongoClient.db(herokuDb).collection(collection).findOne({ week: args[0].value }, (err, result) => {
                        if (err) {
                            console.error(err);
                            throw err;
                        }

                        let specifiedSnm = result;
                        let printArray = [];
                        let tempMovies = [];

                        // runs through week and get movies, winner and ratings
                        // let description = `Summary of Sunday Night Movie ${specifiedSnm.week}`;
                        let description = `Status: **${specifiedSnm.paused ? 'paused' : specifiedSnm.status}**\n`;
                        for (let userIndex in specifiedSnm.users) {
                            // If user just voted - no entries or ratings = skip user on summary
                            if (!specifiedSnm.users[userIndex].movies.length > 0 && !specifiedSnm.users[userIndex].rating) continue;
                            printArray[userIndex] = `${specifiedSnm.users[userIndex].username} - \n`;
                            // checks if user has movies and add it to printArray in the position of title key (to print in order in the end)
                            if (specifiedSnm.users[userIndex].movies) {
                                for (let movieIndex in specifiedSnm.users[userIndex].movies) {
                                    // if movie is the winner, add to description text
                                    if (specifiedSnm.users[userIndex].movies[movieIndex].titleKey === specifiedSnm.winner.titleKey)
                                        description += `Winner: **${specifiedSnm.users[userIndex].movies[movieIndex].title}**${specifiedSnm.winner.voteCount ? ` | ${specifiedSnm.winner.voteCount} votes` : ""}\n\n`;
                                    tempMovies.push(`\`${specifiedSnm.users[userIndex].movies[movieIndex].title}\``);
                                }
                            }
                            printArray[userIndex] += `${tempMovies.length > 0 ? `Entries: ${tempMovies.join(" | ")}\n` : ""}${specifiedSnm.users[userIndex].rating ? `Rating: ${specifiedSnm.users[userIndex].rating}\n\n` : "\n"}`;
                            tempMovies = [];
                        }

                        let embed = new Discord.MessageEmbed()
                            // Set the title of the field
                            .setTitle(`📖 Summary of Sunday Night Movie ${specifiedSnm.week} 📖`)
                            // Set the color of the embed
                            .setColor(0x3498DB)
                            // Set the main content of the embed
                            .setDescription(description + printArray.join(""));
                        // Returns the embed

                        mongoClient.close();
                        m.edit('', embed);
                    });
                });
            }
            break;
        case 'torrent':
            // Search for a torrent on a list of providers
            // const tips = ['You can use this command via DM!', 'Specifying a year usually helps - Movie Name (2019)']

            // TODO: Interaction/Follow-up message system
            // Sends to-be-edited "Checking..." message
            let torrentMsg = await client.channels.cache.get(interaction.channel_id).send(`Checking...`);

            // Searchs torrents
            await torrentSearch.search(['ThePirateBay', '1337x', 'Rarbg'], args[0].value, null, 3).then((result) => {
                if (result.length === 0 || result[0].title === "No results returned")
                    torrentMsg.edit('', new Discord.MessageEmbed().setTitle(`Torrents Found: `).setDescription(`No torrent found 😔`).setColor(0x3498DB));
                else {
                    let torrentList = "";
                    for (let torrent of result) {
                        torrentList += `\n\n[${torrent.title}](${torrent.magnet ? 'https://magnet.guiler.me?uri=' + encodeURIComponent(torrent.magnet) : torrent.desc})\n${torrent.size} | ${torrent.seeds} seeders | ${torrent.provider}`;
                    }
                    let torrentEmbed = new Discord.MessageEmbed().setTitle(`Torrents Found: `).setDescription(torrentList).setColor(0x3498DB);
                    // if (interaction. message.channel.guild)
                    //     torrentEmbed.setFooter(`Tip: ${tips[Math.floor(Math.random() * tips.length)]}`);
                    // else
                    //     torrentEmbed.setFooter(`Tip: ${tips[1]}`);
                    torrentMsg.edit('', torrentEmbed);
                }
            });
            break;
        case 'subtitle':
            let sub;
            let lang = args[1] ? args[1].value : 'eng';
            // Open Subtitle returns pt-br in an 'pb' object even with the pt-br code being pob.
            // We need this to search the object
            let objLang = 'en';

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

            // TODO: Interaction responses
            try {
                if (sub) {
                    logMessage = `Found ${sub[objLang].filename}`;
                    client.channels.cache.get(interaction.channel_id).send(subEmbed
                        .setDescription(`[${sub[objLang].filename}](${sub[objLang].url})\n${sub[objLang].lang} | ${sub[objLang].downloads} downloads | .${sub[objLang].format}`)
                    );
                }
                else {
                    logMessage = `No sub found`;
                    client.channels.cache.get(interaction.channel_id).send(subEmbed
                        .setDescription(`No subtitle found 😔`)
                    );
                }
            }
            catch (e) {
                reportError(e);
                client.channels.cache.get(interaction.channel_id).send(subEmbed.setDescription(`An error has occured. Tell my master about it.`));
            }
            break;
        case 'meme':

            const memeName = args ? args.find(arg => arg.name === 'name') : null;
            const list = args ? args.find(arg => arg.name === 'list') : null;

            // If no args = send random meme
            if (!args || memeName === '') {
                if (usableMemes.length === 0)
                    usableMemes = [...memes];
                let randomMemeIndex = Math.floor(Math.random() * usableMemes.length);
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: usableMemes.splice(randomMemeIndex, 1)[0].meme
                        }
                    }
                });
            }

            // If list is requested
            if (list && list.value === true) {
                let user = await client.users.fetch(interaction.member.user.id);
                await user.send(
                    new Discord.MessageEmbed()
                        .setTitle('Available Memes')
                        .setDescription(memes.map((meme) => meme.name))
                        .setColor(0x3498DB)
                );
            }

            if (memeName && memeName.value) {
                // If a specific meme is requested
                const selectedMeme = memes.find((meme) => {
                    if (meme.name === memeName.value) {
                        return meme;
                    };
                });
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: selectedMeme ? selectedMeme.meme : 'No meme found\nCheck out the /meme list:true command'
                        }
                    }
                });
            }
            break;
        case 'rato':
            // If theres a message
            if (args && args[0].value) {
                // Uses rato_plaquista as templete for text
                Jimp.read('src/rato/rato_plaquista4x.png').then(image => {
                    Jimp.loadFont('src/rato/font/rato_fontista.fnt').then(font => {
                        image.print(font, 240, 40, args[0].value, 530);
                        image.writeAsync('src/rato/rato_plaquistaEditado.jpg').then(result => {
                            client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 4,
                                    data: {
                                        content: '🐀🎾:'
                                    }
                                }
                            });
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
            client.api.interactions(interaction.id, interaction.token).callback.post({
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
            client.api.interactions(interaction.id, interaction.token).callback.post({
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
            const serverEmojis = client.guilds.cache.get(interaction.guild_id).emojis.cache;
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
                new Discord.MessageEmbed()
                    .setTitle(pollTitle)
                    .setColor(0x3498DB)
                    .setDescription(pollOptions.join(`\n\n`))
                    .setFooter('Vote by reacting with the corresponding emoji')
            );

            // Reacts to embed accordingly
            for (let i = 0; i < pollOptions.length; i++) {
                await msg.react(pickedEmojis[i]);
            };
            break;
        case 'toma':
            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: 'https://cdn.discordapp.com/emojis/487347201706819584.png'
                    }
                }
            });
            break;
        case 'movie':
            // FIXME: Messy AF - Maybe let default be EN

            let title = args ? args.find(arg => arg.name === 'title').value : null;
            let jwLocale = args[1] ? args.find(arg => arg.name === 'language').value : null;

            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: 'Checking...'
                    }
                }
            });

            // Sends to-be-edited "Checking..." message
            const jwMessage = await client.channels.cache.get(interaction.channel_id).send(`🔎`);

            const jwEN = new JustWatch();
            const jwBR = new JustWatch({ locale: 'pt_BR' });
            // Gets movie Just Watch's ID
            // Primary locale for search is pt_BR but optionally can be en_US
            let jwSearch;
            if (jwLocale === 'en') {
                jwSearch = await jwEN.search({ query: args[0].value });
            }
            else {
                jwLocale = 'pt';
                jwSearch = await jwBR.search({ query: args[0].value });
            };

            // Filter by movies
            jwSearch.items = jwSearch.items.filter(item => item.object_type === 'movie');
            // If no movie was found
            if (jwSearch.items.length <= 0) {
                jwMessage.edit(`Movie not found 😞`);
                break;
            }
            // Gets full movie detail
            const jwTitleBR = await jwBR.getTitle('movie', jwSearch.items[0].jw_entity_id.replace('tm', ''));
            // Searchs movie in english - need to get the english title for torrent finding
            const jwTitleEN = await jwEN.getTitle('movie', jwSearch.items[0].jw_entity_id.replace('tm', ''));

            // Creates provider list so I can ignore duplicate versions (sd, hd, 4k - doesn't matter for this use case)
            const providerIdsBR = [];
            const providerIdsEN = [];
            // Removes duplicates
            jwTitleBR.offers ? jwTitleBR.offers = jwTitleBR.offers.filter(offer => {
                if (offer.monetization_type === 'flatrate' && providerIdsBR.indexOf(offer.provider_id) < 0) {
                    providerIdsBR.push(offer.provider_id)
                    return offer;
                }
            }) : null;
            jwTitleEN.offers ? jwTitleEN.offers = jwTitleEN.offers.filter(offer => {
                if (offer.monetization_type === 'flatrate' && providerIdsEN.indexOf(offer.provider_id) < 0) {
                    providerIdsEN.push(offer.provider_id)
                    return offer;
                }
            }) : null;
            // We just need IMDB and TMDB score
            jwTitleBR.scoring = jwTitleBR.scoring.filter(score => score.provider_type === 'imdb:score' || score.provider_type === 'tmdb:score');

            // Searchs torrent and subtitle
            let jwTorrentField = 'No torrent found';
            let jwSubtitle;
            let jwTorrent = await torrentSearch.search(['Rarbg'], `${jwTitleEN.title} ${jwTitleEN.original_release_year} 1080`, 'Movies', 1).catch((e) => reportError(e));

            // If Rarbg breaks, try again
            if (jwTorrent.length === 0 || !jwTorrent) {
                // Little hack to force second execution - without this the code was being skipped - something to do with async stuff
                await new Promise(resolve => setTimeout(resolve, 0));
                // Searches in other trackers
                jwTorrent = await torrentSearch.search(['Rarbg', 'ThePirateBay', '1337x'], `${jwTitleEN.title} ${jwTitleEN.original_release_year} 1080`, 'Movies', 1).catch((e) => reportError(e));
            }

            if (jwTorrent && jwTorrent.length !== 0 && jwTorrent[0].title !== "No results returned") {
                if (jwLocale === 'en')
                    jwSubtitle = await searchSubtitle(jwTorrent[0].title, 'eng').catch((e) => reportError(e));
                else
                    jwSubtitle = await searchSubtitle(jwTorrent[0].title, 'pob').catch((e) => reportError(e));
                jwTorrentField = `[${jwTorrent[0].title}](${jwTorrent[0].magnet ? 'https://magnet.guiler.me?uri=' + encodeURIComponent(jwTorrent[0].magnet) : jwTorrent[0].desc})\n${jwTorrent[0].size} | ${jwTorrent[0].seeds} seeders | ${jwTorrent[0].provider} | ${jwSubtitle ? `[Subtitle](${jwLocale === 'en' ? jwSubtitle['en'].url : jwSubtitle['pb'].url})` : `No subtitle found`}` || 'No torrent found';
            }

            let embedTitleValue;
            let embedURLValue;
            let embedImageValue;

            let embedPlotValue;
            let embedGenreValue;
            let embedWhereToWatchValue;
            let embedDirectorValue;
            let embedRuntimeValue = 'Not Found';
            let embedRatingValue = {};

            if (jwLocale === 'en') {
                embedTitleValue = `${jwTitleEN.title} (${jwTitleEN.original_release_year})`;
                embedURLValue = `https://justwatch.com${jwTitleEN.full_path}`;
                embedImageValue = `https://images.justwatch.com${jwTitleEN.poster.replace('{profile}', 's592')}`
                embedPlotValue = jwTitleEN.short_description || 'Not Found';

                // Genre
                embedGenreValue = jwTitleEN.genre_ids.map(genreArray => {
                    return jwGenresEN.find(genre => genreArray === genre.id).translation
                }).join(' | ') || 'Not Found';

                // Where to watch
                embedWhereToWatchValue = jwTitleEN.offers ? jwTitleEN.offers.map(offer => {
                    let offerRtn = jwProvidersEN.find(provider => provider.id === offer.provider_id);
                    return `[${offerRtn.clear_name}](${offer.urls.standard_web})`;
                }).join(' | ') || 'Not Found' : 'Not Found';

                // Director
                embedDirectorValue = jwTitleEN.credits.map(credit => {
                    if (credit.role === 'DIRECTOR') return credit.name
                }) || 'Not Found';

                // Runtime
                if (jwTitleEN.runtime) {
                    let hours = (jwTitleEN.runtime / 60);
                    let rhours = Math.floor(hours);
                    let minutes = (hours - rhours) * 60;
                    let rminutes = Math.round(minutes);
                    embedRuntimeValue = `${rhours}:${rminutes < 10 ? `0${rminutes}` : rminutes}`;
                }

                // Rating
                jwTitleEN.scoring.map(score => {
                    if (score.provider_type === 'imdb:score')
                        embedRatingValue.imdb = `|| ${score.value} ||` || 'Not Found';
                    else if (score.provider_type === 'tmdb:score')
                        embedRatingValue.tmdb = `|| ${score.value} ||` || 'Not Found';
                    else null
                });
            }
            else {
                embedTitleValue = `${jwTitleBR.title} (${jwTitleBR.original_release_year})`;
                embedURLValue = `https://justwatch.com${jwTitleBR.full_path}`;
                embedImageValue = `https://images.justwatch.com${jwTitleBR.poster.replace('{profile}', 's592')}`;
                embedPlotValue = jwTitleBR.short_description || 'Not Found'

                // Genre
                embedGenreValue = jwTitleBR.genre_ids.map(genreArray => {
                    return jwGenresBR.find(genre => genreArray === genre.id).translation
                }).join(' | ') || 'Not Found';

                // Where to watch
                embedWhereToWatchValue = jwTitleBR.offers ? jwTitleBR.offers.map(offer => {
                    let offerRtn = jwProvidersBR.find(provider => provider.id === offer.provider_id);
                    return `[${offerRtn.clear_name}](${offer.urls.standard_web})`;
                }).join(' | ') || 'Not Found' : 'Not Found';

                // Director
                embedDirectorValue = jwTitleBR.credits.map(credit => {
                    if (credit.role === 'DIRECTOR') return credit.name
                }) || 'Not Found';

                // Runtime
                if (jwTitleBR.runtime) {
                    let hours = (jwTitleBR.runtime / 60);
                    let rhours = Math.floor(hours);
                    let minutes = (hours - rhours) * 60;
                    let rminutes = Math.round(minutes);
                    embedRuntimeValue = `${rhours}:${rminutes < 10 ? `0${rminutes}` : rminutes}`;
                }

                // Rating
                jwTitleBR.scoring.map(score => {
                    if (score.provider_type === 'imdb:score')
                        embedRatingValue.imdb = `|| ${score.value} ||` || 'Not Found';
                    else if (score.provider_type === 'tmdb:score')
                        embedRatingValue.tmdb = `|| ${score.value} ||` || 'Not Found';
                    else null
                });
            }

            // Send Embed
            await jwMessage.edit('', new Discord.MessageEmbed()
                // Original title + (release year) - The Lodge (2020)
                .setTitle(embedTitleValue)
                // JustWatch URL
                .setURL(embedURLValue)
                .setColor(0x3498DB)
                // Movie poster
                .setImage(embedImageValue)
                .addFields(
                    {
                        // Synopse
                        name: 'Plot',
                        value: embedPlotValue
                    },
                    {
                        // Genres
                        name: 'Genre',
                        value: embedGenreValue
                    },
                    {
                        name: 'Directed by',
                        value: embedDirectorValue,
                        inline: true
                    },
                    {
                        name: 'Runtime',
                        value: embedRuntimeValue,
                        inline: true
                    },
                    {
                        name: 'Where to watch',
                        value: embedWhereToWatchValue
                    },
                    {
                        name: 'IMDB',
                        value: embedRatingValue.imdb,
                        inline: true
                    },
                    {
                        name: 'TMDB',
                        value: embedRatingValue.tmdb,
                        inline: true
                    },
                    {
                        name: 'Torrent',
                        value: jwTorrentField
                    },
                )
            );
            break;
        case 'donato':
            client.api.interactions(interaction.id, interaction.token).callback.post({
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
                        content: `Rating <@!${args[0].value}>`
                    }
                }
            });

            const queridometroEmojis = ['🐍', '🤮', '🙂', '☹', '💣', '♥', '💔', '🍌', '🪴'];

            // Send message and react accordingly
            let queridometroMsg = await client.channels.cache.get(interaction.channel_id).send(ratingUser.avatarURL() || 'https://discord.com/assets/2c21aeda16de354ba5334551a883b481.png');
            for (let i = 0; i < queridometroEmojis.length; i++) {
                await queridometroMsg.react(queridometroEmojis[i]);
            };
            break;
    }

    // Logs stuff
    console.log(`\n${interaction.member.user.username} executed '${interaction.data.name}' ${args ? `with "${JSON.stringify(args)}"` : ""}`);
    logMessage ? console.log(logMessage) : null;
})

client.on('ready', () => {
    console.log(`${client.user.username} has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
    client.user.setActivity(`Beep boop`);

    // Guizzorde's BOT ID and APP id are different - we need the APP ID to register slash commands
    // If local bot id is the app id - If on production set manually
    const appID = config ? client.user.id : '168354315612717056';

    // Register slash commands
    // try {
    //     // help
    //     client.api.applications(appID).commands.post({
    //         data:
    //         {
    //             name: 'help',
    //             description: `Show the list of commands`,
    //         }
    //     });

    //     // ping
    //     client.api.applications(appID).commands.post({
    //         data:
    //         {
    //             name: 'ping',
    //             description: `Show the bot's ping`,
    //         }
    //     });

    //     // say <message>
    //     client.api.applications(appID).commands.post({
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

    //     // Only register these when not on local bot
    //     // Exclusive Top Server BR commands
    //     if (!config) {
    //         // snm [week]
    //         client.api.applications(appID).guilds('84290462843670528').commands.post({
    //             data:
    //             {
    //                 name: 'snm',
    //                 description: `Show this week movies or specified week summary`,
    //                 options: [
    //                     {
    //                         type: 4,
    //                         name: 'week',
    //                         description: 'A SNM week number',
    //                     },
    //                     {
    //                         type: 4,
    //                         name: 'export',
    //                         description: 'Export a SNM .json data',
    //                     }
    //                 ]
    //             }
    //         });

    //         // snmTitle add <title>
    //         // snmTitle remove [title]
    //         client.api.applications(appID).guilds('84290462843670528').commands.post({
    //             data:
    //             {
    //                 name: 'snmTitle',
    //                 description: `Add or remove SNM entries`,
    //                 options: [
    //                     {
    //                         type: 1,
    //                         name: 'add',
    //                         description: 'Add a movie to current SNM',
    //                         options: [
    //                             {
    //                                 type: 3,
    //                                 name: 'title',
    //                                 required: true,
    //                                 description: 'The movie title'
    //                             }
    //                         ]
    //                     },
    //                     {
    //                         type: 1,
    //                         name: 'remove',
    //                         description: 'Remove a movie from current SNM',
    //                         options: [
    //                             {
    //                                 type: 3,
    //                                 name: 'title',
    //                                 description: 'The movie title or SNM number'
    //                             }
    //                         ]
    //                     }
    //                 ]
    //             }
    //         });

    //         // snmRate <text>
    //         client.api.applications(appID).guilds('84290462843670528').commands.post({
    //             data:
    //             {
    //                 name: 'snmRate',
    //                 description: `Add or change your current SNM rating`,
    //                 options: [
    //                     {
    //                         type: 3,
    //                         name: 'rating',
    //                         description: 'Your rating',
    //                         required: true
    //                     }
    //                 ]
    //             }
    //         });

    //         // snmVotes <Show | Clear>
    //         client.api.applications(appID).guilds('84290462843670528').commands.post({
    //             data:
    //             {
    //                 name: 'snmVotes',
    //                 description: `Manage your current SNM votes`,
    //                 options: [
    //                     {
    //                         type: 3,
    //                         name: 'command',
    //                         description: 'Show or clear your votes',
    //                         required: true,
    //                         choices: [
    //                             {
    //                                 name: 'Show',
    //                                 value: 'show'
    //                             },
    //                             {
    //                                 name: 'Clear',
    //                                 value: 'clear'
    //                             }
    //                         ]
    //                     }
    //                 ]
    //             }
    //         });

    //         // snmAdmin <new|start|end|pause>
    //         client.api.applications(appID).guilds('84290462843670528').commands.post({
    //             data:
    //             {
    //                 name: 'snmAdmin',
    //                 description: `Manage current SNM`,
    //                 // default: true,
    //                 options: [
    //                     {
    //                         type: 3,
    //                         name: 'command',
    //                         required: true,
    //                         description: 'The admin command',
    //                         choices: [
    //                             {
    //                                 name: 'Create a new SNM',
    //                                 value: 'new'
    //                             },
    //                             {
    //                                 name: 'Start current SNM voting',
    //                                 value: 'start'
    //                             },
    //                             {
    //                                 name: 'End current SNM voting',
    //                                 value: 'end'
    //                             },
    //                             {
    //                                 name: 'Toggle automatic SNM functions',
    //                                 value: 'pause'
    //                             }
    //                         ]
    //                     }
    //                 ]
    //             }
    //         });
    //     }

    //     // torrent <query>
    //     client.api.applications(appID).commands.post({
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
    //     client.api.applications(appID).commands.post({
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
    //     client.api.applications(appID).commands.post({
    //         data:
    //         {
    //             name: 'meme',
    //             description: `Send a random meme in chat!`,
    //             options: [
    //                 {
    //                     type: 3,
    //                     name: 'name',
    //                     description: 'Choose a specific meme to send',
    //                 },
    //                 {
    //                     type: 5,
    //                     name: 'list',
    //                     description: 'Lists all available memes'
    //                 }
    //             ]
    //         }
    //     });

    //     // rato [message]
    //     client.api.applications(appID).commands.post({
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
    //     client.api.applications(appID).commands.post({
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
    //     client.api.applications(appID).commands.post({
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
    //     client.api.applications(appID).commands.post({
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
    //     client.api.applications(appID).commands.post({
    //         data:
    //         {
    //             name: 'toma',
    //             description: `...toma...`
    //         }
    //     });

    //     // movie <movie title> [language]
    //     client.api.applications(appID).commands.post({
    //         data:
    //         {
    //             name: 'movie',
    //             description: `Show info about a movie`,
    //             options: [
    //                 {
    //                     type: 3,
    //                     name: 'title',
    //                     required: true,
    //                     description: `What's the name of the movie?`
    //                 },
    //                 {
    //                     type: 3,
    //                     name: 'language',
    //                     description: 'Specify the database search language',
    //                     choices: [
    //                         {
    //                             name: 'English',
    //                             value: 'en'
    //                         },
    //                         {
    //                             name: 'Portuguese',
    //                             value: 'pt'
    //                         }
    //                     ]
    //                 }
    //             ]
    //         }
    //     });

    //     // donato
    //     client.api.applications(appID).commands.post({
    //         data:
    //         {
    //             name: 'donato',
    //             description: `Send a Donato in the chat!`
    //         }
    //     });

    // // queridometro
    // client.api.applications(appID).commands.post({
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

    // Gets latest SNM
    try {
        mongodb.MongoClient.connect(uri, { useNewUrlParser: true }, (err, mongoClient) => {
            if (err) {
                console.error(err);
                throw err;
            }

            mongoClient.db(herokuDb).collection(collection).findOne({}, { sort: { week: -1 }, limit: 1 }, (err, result) => {
                if (err) {
                    console.error(err);
                    throw err;
                }

                lastSnm = result;

                // Schedule SNM Comands
                if (!lastSnm.paused) {
                    snmToggleJobs(true);
                }

                // if there is a vote going on, add voting message to cache
                if (lastSnm.voteMessage) {
                    client.channels.fetch(lastSnm.voteMessage.channelId).then(channel => {
                        channel.messages.fetch(lastSnm.voteMessage.messageId);
                    });
                }

                mongoClient.close();
            });
        });
    }
    catch (e) {
        reportError(e);
    }
});

// client.on('raw', event => {
//     if (!lastSnm || lastSnm.status != 'voting') return;

//     let channel = client.channels.get(lastSnm.voteMessage.channelId);

//     if (channel.messages.has(lastSnm.voteMessage.messageId)) return;    

//     if (event.t === 'MESSAGE_REACTION_ADD' && event.d.message_id === lastSnm.voteMessage.messageId)
// 	    console.log('\nRaw event data:\n', event);
// });

client.on('error', (error) => {
    reportError(error);
});

client.on('messageReactionAdd', async (reaction, user) => {
    // reactions from self, do nothing
    if (user.id === client.user.id) return;
    // reaction on snm voting message
    else if (lastSnm.voteMessage && reaction.message.id === lastSnm.voteMessage.messageId) {
        if (reaction.users.cache.find(userIndex => userIndex.id === user.id)) {

            // User added a new reaction ( = did not click an existing reaction), remove and do nothing
            if (reaction.count === 1) {
                await reaction.users.remove(user);
                console.log(`${user.username} - Invalid reaction on SNM`);
                return;
            }
            // If SNM not voting, remove and warn user
            else if (lastSnm.status !== "voting") {
                await reaction.users.remove(user);
                console.log(`${user.username} - Voting has ended`);
                return client.users.cache.get(user.id).send(`Voting has ended`);
            }

            let userObject = lastSnm.users.find(userIndex => userIndex.userId === user.id)
            let movieTitleKey = lastSnm.emojisUsed.find(emoji => emoji.emoji === reaction.emoji.identifier || emoji.emoji === reaction.emoji.name).titleKey;

            // user is not on the list yet
            if (!userObject) {
                let movieTitle = lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === movieTitleKey)).movies.find(movie => movie.titleKey === movieTitleKey).title;
                userObject = lastSnm.users[lastSnm.users.push({ userId: user.id, username: user.username, movies: [], votes: [movieTitleKey] }) - 1];
                saveSnmFile(() => { });
                client.users.cache.get(user.id).send(`You voted on \`${movieTitle}\``);
                console.log(`Added user ${user.username} with his/her vote`);
            }
            // user already voted on that movie
            else if (userObject.votes.includes(movieTitleKey)) {
                client.users.cache.get(user.id).send(`You already voted on that movie.`);
                console.log(`Duplicate vote`);
            }
            // valid vote
            else if (userObject.votes.length < NUMBEROFVOTES) {
                let movieTitle = lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === movieTitleKey)).movies.find(movie => movie.titleKey === movieTitleKey).title;
                userObject.votes.push(movieTitleKey);
                client.users.cache.get(user.id).send(`You voted on \`${movieTitle}\``);
                saveSnmFile(() => { });
                console.log(`${user.username} voted. ${userObject.votes.length}/${NUMBEROFVOTES}`);
            }
            // no votes left
            else {
                client.users.cache.get(user.id).send(`You have no votes left.\n\`!snmVotes clear\` to reset all your votes.`);
                console.log(`No votes left`);
            }

            await reaction.users.remove(user);
        }
    }
    // reaction on torrent second option
    else if (lastSnm.voteMessage && reaction.message.embeds.length > 0 && reaction.message.embeds[0].title === `SNM ${lastSnm.week} Second Option`) {
        await reaction.users.remove(user);

        let oldDesc = torrentMessage.embeds[0].description

        torrentMessage.edit(new Discord.MessageEmbed().setTitle(`Torrent and Subtitle`).setColor(0x3498DB).setDescription(reaction.message.embeds[0].description))
            .then((msg) => {
                reaction.message.edit(new Discord.MessageEmbed().setTitle(`SNM ${lastSnm.week} Second Option`).setColor(0x3498DB).setDescription(oldDesc).setFooter(`click the reaction to swap to this`)).then(() => torrentMessage = msg);
            });
    }
});

client.on('message', async message => {

    // If message is from another bot, ignore
    if (message.author.bot && message.author.id !== client.user.id) return;

    // If message does not contain prefix, ignore
    if (message.content.indexOf(prefix) !== 0) return;

    // If message is *all* prefix, ignore (ex "!!!!!!!!!")
    if (/^!{2,}.*$/.test(message.content.replace(' ', ''))) return;

    // If message is just the prefix, ignore (ex: "!")
    if (message.content === "!") return;

    // Separate message from prefix
    // "clean" means the message does not use discord hashes for channels and mentions. e.g. <!@numbers>
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cleanArgs = message.cleanContent.slice(prefix.length).trim().split(/ +/g);

    const command = args.shift().toLowerCase();
    const cleanCommand = cleanArgs.shift().toLowerCase();

    // To get the "message" itself we join the `args` back into a string with spaces: 
    const messageText = args.join(" ");
    const cleanMessageText = cleanArgs.join(" ");

    let logMessage = "";

    switch (command) {
        case 'help':
            let description = `!ping - Pings the API
            \n!say <message> - Make the bot say something
            \n!snm [week number] - Show this week movies or specified week summary
            \n!snmNew - Start a new week of SNM™
                \n!snmStart - Initiate voting
                \n!snmVotes [clear] - See your votes or clear them
                \n!snmEnd [winner title or position] - Count votes or manually select a winner
            \n!snmPause - Pauses/Unpauses this week SNM - stop command scheduling
            \n!snmAdd <movie title> - Add a movie to this week pool
            \n!snmRemove <movie title or number> - Remove a movie from the week pool
            \n!snmRate <text> - Leave a rating note for this week's movie
            \n!snmExport [week number] - Create a text file with all SNM™ data
            \n!torrent <query> - Search for torrents on public trackers
            \n!subtitle <title> [language] - Search for a subtitle file
            \n!meme [meme name | list] - 👀 ||do it||
                \n!rato - Gets a random tenista™
                \n!ratoTenista <message> - Make rato tenista say something
            \n!emoji <message> - Convert your message into Discord's regional indicator emojis :abc:
            \n!random <option1, option2, option3, ...> - Randomly pick from one of the options
            \n!poll <poll title>, <Apple, Orange, Pineapple, ...> - Start a poll that people can vote on
            \n!movie <movie title> [language] - Display info about a movie - Can force english search with 'en'
                
                **<> means a parameter is mandatory and [] is optional**`;

            const embed = new Discord.MessageEmbed()
                // Set the title of the field
                .setTitle(`My Commands`)
                // Set the color of the embed
                .setColor('#4286f4')
                // Set the main content of the embed
                .setDescription(description);
            message.author.send(embed);
            break;
        case 'ping':
            // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
            const m = await message.channel.send('Ping?');
            m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
            break;
        case 'say':
            message.delete().catch(O_o => { });
            // Removes any command from the text, so the bot doesn't execute !snmStart or loops !say for example
            const sendMessage = messageText.replace(/!\w+/gim, '');
            if (sendMessage)
                message.channel.send(sendMessage);
            else
                message.author.send(`You forgot to tell me what to say.\nUsage: \`!say <something>\``);
            break;
        case 'snm':
            // Sends rich embed with SNM infos
            // If no week was specified or if specified week is current one
            if (!messageText || Number(messageText) === lastSnm.week && lastSnm.status != "finished") {
                message.channel.send(snmEmbed());
                break;
            }
            else if (!Number(messageText) || Number(messageText) > lastSnm.week) {
                // User entered text or a week bigger than current one
                message.channel.send(`Thats not a valid week`);
                logMessage = `Week ${messageText} is invalid`;
                break;
            }
            else {
                // If a week was specified, show that SNM summary
                let m = await message.channel.send("Checking...");
                mongodb.MongoClient.connect(uri, { useNewUrlParser: true }, (err, mongoClient) => {
                    if (err) {
                        console.error(err);
                        throw err;
                    }

                    mongoClient.db(herokuDb).collection(collection).findOne({ week: Number(messageText) }, (err, result) => {
                        if (err) {
                            console.error(err);
                            throw err;
                        }

                        let specifiedSnm = result;
                        let printArray = [];
                        let tempMovies = [];

                        // runs through week and get movies, winner and ratings
                        // let description = `Summary of Sunday Night Movie ${specifiedSnm.week}`;
                        let description = `Status: **${specifiedSnm.paused ? 'paused' : specifiedSnm.status}**\n`;
                        for (let userIndex in specifiedSnm.users) {
                            // If user just voted - no entries or ratings = skip user on summary
                            if (!specifiedSnm.users[userIndex].movies.length > 0 && !specifiedSnm.users[userIndex].rating) continue;
                            printArray[userIndex] = `${specifiedSnm.users[userIndex].username} - \n`;
                            // checks if user has movies and add it to printArray in the position of title key (to print in order in the end)
                            if (specifiedSnm.users[userIndex].movies) {
                                for (let movieIndex in specifiedSnm.users[userIndex].movies) {
                                    // if movie is the winner, add to description text
                                    if (specifiedSnm.users[userIndex].movies[movieIndex].titleKey === specifiedSnm.winner.titleKey)
                                        description += `Winner: **${specifiedSnm.users[userIndex].movies[movieIndex].title}**${specifiedSnm.winner.voteCount ? ` | ${specifiedSnm.winner.voteCount} votes` : ""}\n\n`;
                                    tempMovies.push(`\`${specifiedSnm.users[userIndex].movies[movieIndex].title}\``);
                                }
                            }
                            printArray[userIndex] += `${tempMovies.length > 0 ? `Entries: ${tempMovies.join(" | ")}\n` : ""}${specifiedSnm.users[userIndex].rating ? `Rating: ${specifiedSnm.users[userIndex].rating}\n\n` : "\n"}`;
                            tempMovies = [];
                        }

                        let embed = new Discord.MessageEmbed()
                            // Set the title of the field
                            .setTitle(`📖 Summary of Sunday Night Movie ${specifiedSnm.week} 📖`)
                            // Set the color of the embed
                            .setColor(0x3498DB)
                            // Set the main content of the embed
                            .setDescription(description + printArray.join(""));
                        // Returns the embed

                        mongoClient.close();
                        m.edit('', embed);
                    });
                });
            }

            break;
        case 'snmnew':
            // can only be done by owner and self - for now.
            if (message.author.id != ownerId && message.author.id != client.user.id) {
                message.channel.send(`You can't do that. Ask my lovely master. 🌵`);
                logMessage = "Author is not owner"
                break;
            }
            // Can only start a new SNM if last one is finished
            else if (lastSnm.status != "finished") {
                message.channel.send(`\`Sunday Night Movie ${lastSnm.week}\` is stil \`${lastSnm.status}\``);
                logMessage = `Last SNM is ${lastSnm.status}`;
                break;
            }

            let newSnm = {
                week: lastSnm.week + 1,
                status: "ongoing",
                movieCount: 0,
                users: [],
                winner: ""
            };

            message.delete().catch(O_o => { });

            insertNewSnm(newSnm, () => {
                let snmRole
                if (message.channel.guild)
                    snmRole = message.guild.roles.cache.find((role) => role.name === "SNM™");
                message.channel.send(`\`Sunday Night Movie ${lastSnm.week}\` requests are now open!\n\`!snmAdd <movie name>\` to request a movie.`);
            })

            logMessage = `SNM ${lastSnm.week + 1} started`;

            break;
        case 'snmstart':
            // Starts voting system

            // can only be done by owner and self - for now.
            if (message.author.id != ownerId && message.author.id != client.user.id) {
                message.channel.send(`You can't do that. Ask my lovely master. 🌵`);
                logMessage = "Author is not owner"
                break;
            }
            else if (!message.guild) {
                message.channel.send("You can't start a vote for yourself. Use it in a server. 🤦‍");
                logMessage = "Channel is not a guild";
                break;
            }
            // can only be used in Top Server BR and Guizzorde Test
            else if (message.guild.id !== "84290462843670528" && message.guild.id !== "556216789688909834") {
                message.channel.send("This can't be used in this server. 💋");
                logMessage = "Wrong guild";
                break;
            }
            else if (lastSnm.status === "voting") {
                message.channel.send(`\`SNM ${lastSnm.week}\` voting has already started!`);
                logMessage = "SNM voting already started";
                break;
            }
            // Cannot start voting if lastSnm is finished
            else if (lastSnm.status === "finished") {
                message.channel.send(`\`SNM ${lastSnm.week}\` is finished.\nWait for the next one!`);
                logMessage = "SNM is finished";
                break;
            }

            lastSnm.status = 'voting';
            message.delete().catch(O_o => { });

            // Check for SNM role
            let snmRole;
            if (message.channel.guild)
                snmRole = message.guild.roles.cache.find((role) => role.name === "SNM™");

            message.channel.send(`${snmRole ? "<@&" + snmRole.id + "> " : ""}\nVoting has started 😱`);
            let voteMessage = await message.channel.send(new Discord.MessageEmbed().setTitle(`🛠 Building... 🛠`));
            // need to save the message id in case bot crashes
            lastSnm.voteMessage = { channelId: voteMessage.channel.id, messageId: voteMessage.id };

            // Builds rich embed with a random emoji for each movie
            let printArray = [];
            let emojiArray = message.guild.emojis.cache;
            let emojisUsed = [];

            lastSnm.users.forEach(user => {
                user.movies.forEach(movie => {
                    let rndEmoji;
                    if (emojiArray.size !== 0) {
                        rndEmoji = emojiArray.random();
                        printArray[movie.titleKey - 1] = `<:${rndEmoji.name}:${rndEmoji.id}> - ${movie.title}\n`;
                        emojisUsed[movie.titleKey - 1] = { titleKey: movie.titleKey, emoji: rndEmoji.identifier };
                        emojiArray.delete(rndEmoji.id);
                    }
                    // It will break if there are more movies than custom emojis
                    else {
                        rndEmoji = randomEmoji();
                        while (emojisUsed.includes(rndEmoji))
                            rndEmoji = randomEmoji();
                        printArray[movie.titleKey - 1] = `${rndEmoji} - ${movie.title}\n`;
                        emojisUsed[movie.titleKey - 1] = { titleKey: movie.titleKey, emoji: rndEmoji };
                    }
                })
            });

            lastSnm.emojisUsed = emojisUsed;
            saveSnmFile(() => { });

            // Create the embed with titles, emojis and reactions
            let votingEmbed = new Discord.MessageEmbed()
                .setTitle(`🌟 Sunday Night Movie ${lastSnm.week} 🌟`)
                .setColor(0x3498DB)
                .setDescription(printArray.join(" "))
                .setFooter('Click the corresponding reaction to vote!');

            voteMessage.edit().then(async msg => {
                for (let i = 0; i < emojisUsed.length; i++) {
                    await msg.react(emojisUsed[i].emoji);
                }
                msg.edit(votingEmbed);
            });

            break;
        case 'snmvotes':
            let userFound = lastSnm.users.find(user => user.userId === message.author.id);

            if (lastSnm.status !== "voting") {
                message.author.send(`Voting has not started`);
                logMessage = `Voting has not started`;
            }
            else if (!userFound || userFound.votes.length === 0) {
                message.author.send(`You have not voted`);
                logMessage = `User has no votes`;
            }
            else if (messageText === "clear") {
                // can't alter votes if snm is finished
                if (lastSnm.status !== 'voting') {
                    message.channel.send(`SNM is finished. You can't alter your votes 👀.`);
                    logMessage = `Last SNM is finished`;
                    break;
                }
                userFound.votes = [];
                logMessage = `${message.author.username} votes reset`;
                saveSnmFile(() => {
                    message.channel.send(`Your votes have been reset.`);
                });
            }
            else {
                let moviesVoted = [];
                userFound.votes.forEach(movieTitleKey => {
                    moviesVoted.push(`\`${lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === movieTitleKey)).movies.find(movie => movie.titleKey === movieTitleKey).title}\``);
                });
                message.author.send(`Your votes: ${moviesVoted.join(" | ")}`);
            }

            break;
        case 'snmend':
            let winnerMovie;
            let msgToEdit;
            let embedTitle;
            let embedDescription;

            // can only be done by owner and self - for now.
            if (message.author.id != ownerId && message.author.id != client.user.id) {
                message.channel.send(`You can't do that. Ask my lovely master. 🌵`);
                logMessage = "Author is not owner"
                break;
            }
            // Can only be ended if status is voting or if requester is owner
            else if (lastSnm.status !== "voting" && message.author.id !== ownerId) {
                message.channel.send(`SNM cannot be ended. It is \`${lastSnm.status}\``);
                logMessage = `SNM is ${lastSnm.status}`;
                break;
            }
            // If a movie was passed
            else if (messageText != "") {
                message.delete().catch(O_o => { });
                embedTitle = `🙌 We have a winner! 🙌`;
                embedDescription = ""
                msgToEdit = await message.channel.send(new Discord.MessageEmbed().setTitle(embedTitle).setDescription("Checking...").setColor(0x3498DB));
                winnerMovie = lastSnm.users.find(user => user.movies.find(movie => movie.title === messageText))
                    || lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === Number(messageText)));
                if (winnerMovie)
                    winnerMovie = winnerMovie.movies.find(movie => movie.title === messageText)
                        || winnerMovie.movies.find(movie => movie.titleKey === Number(messageText))
                // sets winner
                lastSnm.winner = { titleKey: winnerMovie.titleKey };


                if (!winnerMovie) {
                    message.channel.send(`Movie not found`);
                    logMessage = `${messageText} was not found`;
                    break;
                }
            }
            // if no movie was passed
            else {
                message.delete().catch(O_o => { });
                // creates array with titleKey and voteCount (movie:votes)
                let allVotes = [];

                for (let userIndex in lastSnm.users) {
                    for (let movieIndex in lastSnm.users[userIndex].movies) {
                        let titleKey = lastSnm.users[userIndex].movies[movieIndex].titleKey
                        !allVotes[titleKey - 1] ? allVotes[titleKey - 1] = { titleKey: titleKey, voteCount: 0 } : allVotes[titleKey - 1].titleKey = titleKey;
                    }
                    for (let voteIndex in lastSnm.users[userIndex].votes) {
                        let voteTitleKey = lastSnm.users[userIndex].votes[voteIndex];
                        !allVotes[voteTitleKey - 1] ? allVotes[voteTitleKey - 1] = { titleKey: null, voteCount: 1 } : allVotes[voteTitleKey - 1].voteCount++
                    }
                }

                // get what voteCount is the highest
                let maxVotes = allVotes.reduce((prev, current) => {
                    return (prev.voteCount > current.voteCount) ? prev : current;
                });
                // get movies that had more votes (=== maxVotes)
                let winners = allVotes.filter((obj) => {
                    return obj.voteCount === maxVotes.voteCount
                });
                // if more than 1 winner => tied
                if (winners.length > 1) {
                    let tiedWinnersTitle = [];
                    for (let winner in winners) {
                        tiedWinnersTitle.push(`\`${lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === winners[winner].titleKey)).movies.find(movie => movie.titleKey === winners[winner].titleKey).title}\``);
                    }
                    embedTitle = `😲 It's a tie! 😲`;
                    embedDescription = `\n${tiedWinnersTitle.join(" | ")} got ${maxVotes.voteCount} votes each!\nRandomly picking a movie...\n\n`;
                    msgToEdit = await message.channel.send(new Discord.MessageEmbed().setTitle(embedTitle).setDescription(embedDescription + `Checking...`).setColor(0x3498DB));
                    let rndWinnerPos = Math.floor(Math.random() * winners.length);
                    lastSnm.winner = winners[rndWinnerPos];
                    winnerMovie = { title: tiedWinnersTitle[rndWinnerPos].substr(1, tiedWinnersTitle[rndWinnerPos].length - 2) };
                }
                else {
                    embedTitle = `🙌 We have a winner! 🙌`;
                    embedDescription = `With ${maxVotes.voteCount} votes:\n\n`
                    msgToEdit = await message.channel.send(new Discord.MessageEmbed().setTitle(embedTitle).setDescription(embedDescription + `Checking...`).setColor(0x3498DB));
                    lastSnm.winner = winners[0];
                    winnerMovie = { title: lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === lastSnm.winner.titleKey)).movies.find(movie => movie.titleKey === lastSnm.winner.titleKey).title };
                }
            }

            lastSnm.status = "finished";
            saveSnmFile(async () => {
                let finalEmbed = new Discord.MessageEmbed().setTitle(embedTitle).setDescription(embedDescription + `🎉 **${winnerMovie.title}** 🎉`).setColor(0x3498DB);
                await msgToEdit.edit(finalEmbed.setFooter(`Checking for torrents...`))
                let torrentEmbed = await createTorrentEmbed(winnerMovie.title, message.guild.owner);
                    if (!torrentEmbed)
                    msgToEdit.edit(finalEmbed.setFooter(`No torrent found 🤔`));
                    else {
                    msgToEdit.edit(finalEmbed.setFooter(" "));
                        message.channel.send(torrentEmbed).then((msg) => torrentMessage = msg);
                    }
                });

            logMessage = `Winner is **${winnerMovie.title}**`;

            break;
        case 'changesub':
            // can only be done by owner
            if (message.author.id != ownerId) {
                logMessage = "Author is not owner"
                break;
            }
            if (args.length === 0) {
                message.channel.send(`Usage: \`!changeSub <torrent message id> <new sub download link>\``);
                logMessage = "Wrong usage"
                break;
            }
            let torrentMsgGet = await client.channels.cache.get(SNMCHANNEL).messages.fetch(args[0]);
            // If message is the old torrent format (only torrent and sub)
            if (torrentMsgGet.embeds[0].description) {
            torrentMsgGet.edit(torrentMsgGet.embeds[0].setDescription(
                torrentMsgGet.embeds[0].description.replace(/\[Subtitle](.+)/g, `[Subtitle](${args[1]})`)
            ));
            }
            // Else, if new format (full /movie details)
            else {
                const torrentFieldIndex = torrentMsgGet.embeds[0].fields.findIndex(field => field.name === 'Torrent');
                torrentMsgGet.embeds[0].fields[torrentFieldIndex].value = torrentMsgGet.embeds[0].fields[torrentFieldIndex].value.replace(/\[Subtitle](.+)/g, `[Subtitle](${args[1]})`);
                torrentMsgGet.edit(torrentMsgGet.embeds[0]);
            }
            
            logMessage = `Changed sub from ${args[0]} with ${args[1]}`;
            break;
        case 'snmpause':
            // can only be done by owner - for now.
            if (message.author.id != ownerId) {
                message.channel.send(`You can't do that. Ask my lovely master. 🌵`);
                logMessage = "Author is not owner"
                break;
            }
            // Pauses/Unpauses current SNM
            lastSnm.paused = !lastSnm.paused;
            saveSnmFile(() => {
                // paused = true -> stops jobs
                // paused = false -> starts jobs
                snmToggleJobs(!lastSnm.paused);
                message.channel.send(`SNM ${lastSnm.week} is now \`${lastSnm.paused ? 'paused' : 'unpaused'}\``);
                logMessage = `${lastSnm.paused ? 'Paused' : 'Unpaused'} SNM ${lastSnm.week}`;
            });

            break;
        case 'snmadd':
            // if nothing was passed
            if (!messageText) {
                message.channel.send(`You forgot to name the movie.\nUsage: \`!snmAdd <movie-name>\``);
                logMessage = `No movie was passed`;
                break;
            }
            // If snm status != ongoing, cancel request and warn user.
            if (lastSnm.status != "ongoing") {
                message.channel.send(`Requesting period for \`Sunday Night Movie ${lastSnm.week}\` has ended`);
                logMessage = `SNM is ${lastSnm.status}`;
                break;
            }

            let authorId = message.author.id;
            // Checks if user is already on the list
            let userObject = lastSnm.users.find((user) => user.userId === authorId);

            if (userObject) {
                // Check user entries
                if (userObject.movies.length === NUMBEROFENTRIES) {
                    message.channel.send(`You have no entries left.\nRemove entries with \`!snmRemove <movie title or number>\`.`);
                    logMessage = `No entries left ${userObject.movies.length}/${NUMBEROFENTRIES}`;
                    break;
                }
            }
            // Add user to the list and update userObject
            else
                userObject = lastSnm.users[lastSnm.users.push({ userId: authorId, username: message.author.username, movies: [], votes: [] }) - 1];

            // If movie is already on the list, cancel and inform user
            if (lastSnm.users.find((user) => user.movies.find((movie) => movie.title === messageText))) {
                message.channel.send("Movie already on the list");
                logMessage = "Movie was already on the list";
                break;
            }

            // Adds movie to the list
            lastSnm.movieCount++
            userObject.movies.push({ title: messageText, titleKey: lastSnm.movieCount });

            saveSnmFile(() => {
                message.channel.send(`Added \`${messageText}\` to the list`);
                // message.channel.send(snmEmbed())
            });

            logMessage = `${message.author.username} added '${messageText}' to the list`;
            break;
        case 'snmremove':
            // Removes a movie from the list
            let stringFound;
            let numberFound;
            let checkNumber;
            let deleted;

            // Prioritize strings over numbers, as they are more specific.
            // Movie can be "007" which would be a string and not position 7.
            // If message is a number, we will save the titleKey that matches it. In case we don't find a string.
            if (Number(messageText))
                checkNumber = true;

            // Checks if there is a movie with the same name as the message string
            for (let userIndex in lastSnm.users) {
                for (let movieIndex in lastSnm.users[userIndex].movies) {
                    if (lastSnm.users[userIndex].movies[movieIndex].title === messageText) {
                        stringFound = true;
                        // Checks if movie found was submitted by message author
                        if (lastSnm.users[userIndex].userId === message.author.id)
                            deleted = lastSnm.users[userIndex].movies.splice(movieIndex, 1);
                        else {
                            message.channel.send("This is not your movie 😒");
                            logMessage = `${lastSnm.users[userIndex].movies[movieIndex].title} is not authors movie`;
                            break;
                        }
                        break;
                    }
                    // If checkNumber is true and we didn't find a string yet. Check if titleKey matches user message.
                    // If it does, save indexes
                    else if (checkNumber) {
                        if (Number(messageText) === lastSnm.users[userIndex].movies[movieIndex].titleKey)
                            numberFound = [userIndex, movieIndex];
                    }
                }
            }

            // If we didn't find a string but found a matching titleKey, try to delete
            if (numberFound && !stringFound) {
                // Checks if movie found was submitted by message author
                if (lastSnm.users[numberFound[0]].userId === message.author.id)
                    deleted = lastSnm.users[numberFound[0]].movies.splice(numberFound[1], 1);
                else {
                    message.channel.send("This is not your movie 😒");
                    logMessage = `${lastSnm.users[numberFound[0]].movies[numberFound[1]].title} is not authors movie`;
                    break;
                }
            }

            // Fixes titleKeys and movieCount
            if (deleted) {
                deleted = deleted[0]
                lastSnm.movieCount--;
                for (let userIndex in lastSnm.users) {
                    for (let movieIndex in lastSnm.users[userIndex].movies) {
                        if (lastSnm.users[userIndex].movies[movieIndex].titleKey > deleted.titleKey)
                            lastSnm.users[userIndex].movies[movieIndex].titleKey--
                    }
                }

                saveSnmFile(() => {
                    message.channel.send(`Removed \`${deleted.title}\` from the list`);
                    // message.channel.send(snmEmbed())
                });
                logMessage = `${message.author.username} removed '${deleted.title}' from the list`;
            }
            else
                message.channel.send(`Movie not found.\nUsage: \`!snmRemove <movie title or number>\`\n\`!snm\` to see the list`);
            break;
        case 'snmrate':
            // Leave a rating for the movie watched

            // Can only be done if week's SNM is finished
            if (lastSnm.status !== "finished") {
                message.channel.send(`\`Sunday Night Movie ${lastSnm.week}\` is still \`${lastSnm.status}\``);
                logMessage = `SNM ${lastSnm.week} is ${lastSnm.status}`;
                break;
            }
            else {
                let userObject = lastSnm.users.find((user) => user.userId === message.author.id);

                // If new user
                if (!userObject)
                    userObject = lastSnm.users[lastSnm.users.push({ userId: message.author.id, username: message.author.username, movies: [], votes: [] }) - 1];

                userObject.rating = messageText;

                saveSnmFile(() => {
                    message.channel.send(`Your rating was updated.`);
                });

                logMessage = (`${message.author.username}'s rating was updated to: ${messageText}`);
            }
            break;
        case 'snmexport':
            // Exports SNM week data

            let specifiedWeek = Number(messageText) || null;

            // User entered text (not number) or a future week
            if (messageText && !specifiedWeek || Number(messageText) > lastSnm.week) {
                message.channel.send(`\`${messageText}\` is not a valid week\nType \`!snmExport [week number]:optional\` to export a file`);
                logMessage = `${messageText} is not a valid week`;
                break;
            }
            // If we got a number as argument, user specified a week
            else if (specifiedWeek && specifiedWeek <= lastSnm.week) {
                let m = await message.channel.send(`Exporting...`);
                mongodb.MongoClient.connect(uri, { useNewUrlParser: true }, (err, mongoClient) => {
                    if (err) {
                        console.error(err);
                        throw err;
                    }

                    mongoClient.db(herokuDb).collection(collection).findOne({ week: specifiedWeek }, (err, result) => {
                        if (err) {
                            console.error(err);
                            throw err;
                        }
                        mongoClient.close();

                        // Exports specific snm.json as file
                        fs.writeFileSync(`SNM${specifiedWeek}.txt`, JSON.stringify(result, null, 2));
                        const buffer = fs.readFileSync(`./SNM${specifiedWeek}.txt`)
                        const attachment = new Discord.MessageAttachment(buffer, `SNM${specifiedWeek}.txt`);
                        m.delete().catch(O_o => { });
                        message.reply(attachment);
                    });
                });
                break;
            }

            // Exports snm.json as file
            fs.writeFileSync(`SNM${lastSnm.week}.txt`, JSON.stringify(lastSnm, null, 2));
            const buffer = fs.readFileSync(`./SNM${lastSnm.week}.txt`)
            const attachment = new Discord.MessageAttachment(buffer, `SNM${lastSnm.week}.txt`);
            message.reply(attachment);
            break;
        case 'torrent':
            // Search for a torrent on a list of providers
            const tips = ['You can use this command via DM!', 'Specifying a year usually helps - Movie Name (2019)']

            // Value cannot be empty
            if (!messageText) {
                message.channel.send(`No search parameter was entered.\nUsage: \`!torrent <thing>\``);
                logMessage = "No search parameter";
                break;
            }

            // Sends to-be-edited "Checking..." message
            let torrentMsg = await message.channel.send(`Checking...`);

            // Searchs torrents
            await torrentSearch.search(['ThePirateBay', '1337x', 'Rarbg'], messageText, null, 3).then((result) => {
                if (result.length === 0 || result[0].title === "No results returned")
                    torrentMsg.edit('', new Discord.MessageEmbed().setTitle(`Torrents Found: `).setDescription(`No torrent found 😔`).setColor(0x3498DB));
                else {
                    let torrentList = "";
                    for (let torrent of result) {
                        torrentList += `\n\n[${torrent.title}](${torrent.magnet ? 'https://magnet.guiler.me?uri=' + encodeURIComponent(torrent.magnet) : torrent.desc})\n${torrent.size} | ${torrent.seeds} seeders | ${torrent.provider}`;
                    }
                    let torrentEmbed = new Discord.MessageEmbed().setTitle(`Torrents Found: `).setDescription(torrentList).setColor(0x3498DB);
                    if (message.channel.guild)
                        torrentEmbed.setFooter(`Tip: ${tips[Math.floor(Math.random() * tips.length)]}`);
                    else
                        torrentEmbed.setFooter(`Tip: ${tips[1]}`);
                    torrentMsg.edit('', torrentEmbed);
                }
            });
            break;
        case 'subtitle':
            // If empty message
            if (!messageText) {
                message.channel.send(`No search parameter was entered.\nUsage: \`!subtitle <title> [lang]\`\nAccepted lang: \`en\`|\`pt\``);
                break;
            }

            let sub;
            let lang = cleanArgs.pop();
            // Open Subtitle returns pt-br in an 'pb' object even with the pt-br code being pob.
            // We need this to search the object
            let objLang = 'en';

            if (lang === 'en' || lang === 'eng' || lang === 'en-us' || lang === 'us' || lang === 'enus' || lang === 'english' || lang === 'ingles' || lang === 'inglês') {
                sub = await searchSubtitle(cleanArgs.join(' '), lang).catch(e => reportError(e));
            }
            else if (lang === 'pt' || lang === 'pob' || lang === 'pb' || lang === 'pt-br' || lang === 'br' || lang === 'ptbr' || lang === 'portugues' || lang === 'português' || lang === 'portuguese' || lang === 'por') {
                lang = 'pob';
                objLang = 'pb';
                sub = await searchSubtitle(cleanArgs.join(' '), lang).catch(e => reportError(e));
            }
            // if no lang was passed -> default eng
            else {
                sub = await searchSubtitle(cleanMessageText).catch(e => reportError(e));
            }

            const subEmbed = new Discord.MessageEmbed()
                .setTitle(`Subtitle`)
                .setColor(0x3498DB)
                .setFooter(`Tip: You can paste the file name to try a perfect match!`)

            try {
                if (sub) {
                    logMessage = `Found ${sub[objLang].filename}`;
                    message.channel.send(subEmbed
                        .setDescription(`[${sub[objLang].filename}](${sub[objLang].url})\n${sub[objLang].lang} | ${sub[objLang].downloads} downloads | .${sub[objLang].format}`)
                    );
                }
                else {
                    logMessage = `No sub found`;
                    message.channel.send(subEmbed
                        .setDescription(`No subtitle found 😔`)
                    );
                }
            }
            catch (e) {
                reportError(e);
                message.channel.send(subEmbed.setDescription(`An error has occured. Tell my master about it.`));
            }
            break;
        case 'meme':
            if (messageText) {
                // If list is requested
                if (messageText === 'list') {
                    message.channel.send(
                        new Discord.MessageEmbed()
                            .setTitle('Available Memes')
                            .setDescription(memes.map((meme) => meme.name))
                            .setColor(0x3498DB)
                    );
                    break;
                };

                // If a specific meme is requested
                const selectedMeme = memes.find((meme) => {
                    if (meme.name === messageText) {
                        return meme;
                    };
                });
                message.channel.send(selectedMeme ? selectedMeme.meme : 'No meme found\nType !meme list to see all available memes')
                break;
            }
            if (usableMemes.length === 0)
                usableMemes = [...memes];
            let randomMemeIndex = Math.floor(Math.random() * usableMemes.length);
            message.channel.send(usableMemes.splice(randomMemeIndex, 1)[0].meme);
            break;
        case 'ratotenista':
            // Uses rato_plaquista as templete for text

            // Value cannot be empty
            if (!cleanMessageText) {
                message.channel.send(`You must write something after the command.`);
                logMessage = "No text parameter";
                break;
            }

            // message.delete().catch(O_o => { });

            Jimp.read('src/rato/rato_plaquista4x.png').then(image => {
                Jimp.loadFont('src/rato/font/rato_fontista.fnt').then(font => {
                    image.print(font, 240, 40, cleanMessageText, 530);
                    image.writeAsync('src/rato/rato_plaquistaEditado.jpg').then(result => {
                        message.channel.send("", { files: ["src/rato/rato_plaquistaEditado.jpg"] });
                    })
                });
            });
            break;
        case 'rato':
            // Generates a message with a random 'rato tenista' image
            message.channel.send(`ei!! por favor pare!\nisto me deixa`, { files: [`src/rato/tenistas/rato${Math.floor(Math.random() * 72)}.jpg`] });
            break;
        case 'emoji':
            // Converts the inputed message to discord's regional emojis
            let sentence = "";
            for (let letter of cleanMessageText) {
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
            message.channel.send(sentence);
            break;
        case 'random':
            // Without animation
            // TODO: Append 1), 2), 3) at the star of each option?

            if (!messageText) {
                message.channel.send(`Separate each option with a comma ","\nUsage: \`!random Apple, Orange, Pineapple, ...\``)
                logMessage = 'No options';
                break;
            }
            let commaArgs = messageText.split(/,+/g);
            let winner = Math.floor(Math.random() * commaArgs.length)
            let embedColors = [0xFF0000, 0x00FF00, 0x0000FF, 0x808080, 0xFFFF00, 0x3498DB];
            let embedEmojis = ['🍀', '🤞', '🎲', '🎰', '🌠']
            commaArgs[winner] = `\\> ${commaArgs[winner]} <`
            message.channel.send(
                new Discord.MessageEmbed()
                    .setTitle(`${embedEmojis[Math.floor(Math.random() * embedEmojis.length)]} Random Picker ${embedEmojis[Math.floor(Math.random() * embedEmojis.length)]}`)
                    .setColor(embedColors[Math.floor(Math.random() * embedColors.length)])
                    .setDescription(commaArgs.join(`\n\n`))
            );

            // With animation - wip, im scared because rate limiter
            // TODO: Enter channel and play casino sound?

            // if (!messageText)
            //     return message.channel.send(`Separate each option with a comma ","\nUsage: \`!random Apple, Orange, Pineapple, ...\``);
            // let embedColors = [0xFF0000, 0x00FF00, 0x0000FF, 0x808080, 0xFFFF00];
            // let winner = Math.floor(Math.random() * messageText.split(/,+/g).length);
            // let randomEmbed = new Discord.MessageEmbed()
            //     .setTitle(`🎲 Random Picker 🎲`)
            //     .setColor(embedColors[0])
            //     .setDescription(messageText.split(/,+/g).join(`\n`));
            // let sentEmbed = await message.channel.send(randomEmbed);
            // for (let i = 0; i < 5; i++) {
            //     let commaArgs = messageText.split(/,+/g)
            //     if (i === 4) {
            //         commaArgs[winner] = `\\> ${commaArgs[winner]} <`;
            //         sentEmbed.edit(randomEmbed.setDescription(commaArgs.join(`\n`)))
            //     }
            //     else {
            //         let randPosition = Math.floor(Math.random() * commaArgs.length)
            //         let randColor = Math.floor(Math.random() * embedColors.length)
            //         commaArgs[randPosition] = `\\> ${commaArgs[randPosition]} <`
            //         await sentEmbed.edit(randomEmbed
            //             .setColor(embedColors[randColor])
            //             .setDescription(commaArgs.join(`\n`))
            //         )
            //     }
            // }
            break;
        case 'poll':
            if (!messageText) {
                message.channel.send(`Separate each option with a comma ","\nUsage: \`!poll <Poll Title>, Apple, Orange, Pineapple, ...\`\nThe first parameter is always the title`);
                logMessage = 'No options';
                break;
            }
            // Get options
            const pollOptions = messageText.split(/,+/g);
            const pollTitle = pollOptions.splice(0, 1);
            // If no args beside title
            if (pollOptions.length === 0) {
                message.channel.send(`Separate each option with a comma ","\nUsage: \`!poll <Poll Title>, Apple, Orange, Pineapple, ...\`\nThe first parameter is always the title`);
                logMessage = 'No options';
                break;
            };
            // Get server custom emojis
            const serverEmojis = message.channel.guild ? message.guild.emojis.cache : { size: 0 };
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
            const msg = await message.channel.send(
                new Discord.MessageEmbed()
                    .setTitle(pollTitle)
                    .setColor(0x3498DB)
                    .setDescription(pollOptions.join(`\n\n`))
                    .setFooter('Vote by reacting with the corresponding emoji')
            );

            // Reacts to embed accordingly
            for (let i = 0; i < pollOptions.length; i++) {
                await msg.react(pickedEmojis[i]);
            };
            break;
        case 'toma':
            message.channel.send('https://cdn.discordapp.com/emojis/487347201706819584.png');
            break;
        case 'play':
            if (message.author.id !== ownerId && message.author.id !== "132410788722769920") {
                message.channel.send('Função bloqueada pra você. Desbloqueie com 20 dola na mão do pai.');
                logMessage = "not owner";
                break;
            }
            if (!message.member.voice.channel) {
                message.channel.send('You must be connected to a channel');
                logMessage = 'not connected to a channel';
                break;
            }

            connection = await message.member.voice.channel.join();

            if (messageText === 'countdown')
                dispatcher = connection.play(`src/sounds/countdown${Math.floor(Math.random() * 2)}.mp3`, { volume: 0.7 });
            else if (messageText === 'countdown1')
                dispatcher = connection.play(`src/sounds/countdown1.mp3`, { volume: 0.7 });
            else if (messageText === 'countdown2')
                dispatcher = connection.play(`src/sounds/countdown2.mp3`, { volume: 0.7 });
            else
            dispatcher = connection.play(ytdl(messageText, { filter: 'audioonly' }), { volume: 0.15 });

            dispatcher.on('finish', () => {
                connection.disconnect();
                dispatcher.destroy();
            });
            break;
        case 'stop':
            dispatcher.end();
            break;
        case 'movie':
            // FIXME: Messy AF - Maybe let default be EN
            // If no movie was passed
            if (!messageText) {
                message.channel.send(`No movie title.\nUsage: \`!movie <movie title> [en]\``);
                logMessage = `No movie was typed`;
                break;
            };
            
            // Sends to-be-edited "Checking..." message
            const jwMessage = await message.channel.send(`Checking...`);

            let jwLocale = cleanArgs.pop();
            const jwEN = new JustWatch();
            const jwBR = new JustWatch({ locale: 'pt_BR' });
            // Gets movie Just Watch's ID
            // Primary locale for search is pt_BR but optionally can be en_US
            let jwSearch;
            if (jwLocale === 'en' || jwLocale === 'eng' || jwLocale === 'en-us' || jwLocale === 'us' || jwLocale === 'enus' || jwLocale === 'english' || jwLocale === 'ingles' || jwLocale === 'inglês') {
                jwLocale = 'en';
                jwSearch = await jwEN.search({ query: messageText });
            }
            else {
                jwLocale = 'pt';
                jwSearch = await jwBR.search({ query: messageText });
            };

            // Filter by movies
            jwSearch.items = jwSearch.items.filter(item => item.object_type === 'movie');
            // If no movie was found
            if (jwSearch.items.length <= 0) {
                jwMessage.edit(`Movie not found 😞`);
                break;
            }
            // Gets full movie detail
            const jwTitleBR = await jwBR.getTitle('movie', jwSearch.items[0].jw_entity_id.replace('tm', ''));
            // Searchs movie in english - need to get the english title for torrent finding
            const jwTitleEN = await jwEN.getTitle('movie', jwSearch.items[0].jw_entity_id.replace('tm', ''));

            // Creates provider list so I can ignore duplicate versions (sd, hd, 4k - doesn't matter for this use case)
            const providerIdsBR = [];
            const providerIdsEN = [];
            // Removes duplicates
            jwTitleBR.offers ? jwTitleBR.offers = jwTitleBR.offers.filter(offer => {
                if (offer.monetization_type === 'flatrate' && providerIdsBR.indexOf(offer.provider_id) < 0) {
                    providerIdsBR.push(offer.provider_id)
                    return offer;
                }
            }) : null;
            jwTitleEN.offers ? jwTitleEN.offers = jwTitleEN.offers.filter(offer => {
                if (offer.monetization_type === 'flatrate' && providerIdsEN.indexOf(offer.provider_id) < 0) {
                    providerIdsEN.push(offer.provider_id)
                    return offer;
                }
            }) : null;
            // We just need IMDB and TMDB score
            jwTitleBR.scoring = jwTitleBR.scoring.filter(score => score.provider_type === 'imdb:score' || score.provider_type === 'tmdb:score');

            // Searchs torrent and subtitle
            let jwTorrentField = 'No torrent found';
            let jwSubtitle;
            let jwTorrent = await torrentSearch.search(['Rarbg'], `${jwTitleEN.title} ${jwTitleEN.original_release_year} 1080`, 'Movies', 1).catch((e) => reportError(e));

            // If Rarbg breaks, try again
            if (jwTorrent.length === 0 || !jwTorrent) {
                // Little hack to force second execution - without this the code was being skipped - something to do with async stuff
                await new Promise(resolve => setTimeout(resolve, 0));
                // Searches in other trackers
                jwTorrent = await torrentSearch.search(['Rarbg', 'ThePirateBay', '1337x'], `${jwTitleEN.title} ${jwTitleEN.original_release_year} 1080`, 'Movies', 1).catch((e) => reportError(e));
            }

            if (jwTorrent && jwTorrent.length !== 0 && jwTorrent[0].title !== "No results returned") {
                if (jwLocale === 'en')
                    jwSubtitle = await searchSubtitle(jwTorrent[0].title, 'eng').catch((e) => reportError(e));
                else
                    jwSubtitle = await searchSubtitle(jwTorrent[0].title, 'pob').catch((e) => reportError(e));
                jwTorrentField = `[${jwTorrent[0].title}](${jwTorrent[0].magnet ? 'https://magnet.guiler.me?uri=' + encodeURIComponent(jwTorrent[0].magnet) : jwTorrent[0].desc})\n${jwTorrent[0].size} | ${jwTorrent[0].seeds} seeders | ${jwTorrent[0].provider} | ${jwSubtitle ? `[Subtitle](${jwLocale === 'en' ? jwSubtitle['en'].url : jwSubtitle['pb'].url})` : `No subtitle found`}` || 'No torrent found';
            }

            let embedTitleValue;
            let embedURLValue;
            let embedImageValue;

            let embedPlotValue;
            let embedGenreValue;
            let embedWhereToWatchValue;
            let embedDirectorValue;
            let embedRuntimeValue = 'Not Found';
            let embedRatingValue = {};

            if (jwLocale === 'en') {
                embedTitleValue = `${jwTitleEN.title} (${jwTitleEN.original_release_year})`;
                embedURLValue = `https://justwatch.com${jwTitleEN.full_path}`;
                embedImageValue = `https://images.justwatch.com${jwTitleEN.poster.replace('{profile}', 's592')}`
                embedPlotValue = jwTitleEN.short_description || 'Not Found';

                // Genre
                embedGenreValue = jwTitleEN.genre_ids.map(genreArray => {
                    return jwGenresEN.find(genre => genreArray === genre.id).translation
                }).join(' | ') || 'Not Found';

                // Where to watch
                embedWhereToWatchValue = jwTitleEN.offers ? jwTitleEN.offers.map(offer => {
                    let offerRtn = jwProvidersEN.find(provider => provider.id === offer.provider_id);
                    return `[${offerRtn.clear_name}](${offer.urls.standard_web})`;
                }).join(' | ') || 'Not Found' : 'Not Found';

                // Director
                embedDirectorValue = jwTitleEN.credits.map(credit => {
                    if (credit.role === 'DIRECTOR') return credit.name
                }) || 'Not Found';

                // Runtime
                if (jwTitleEN.runtime) {
                    let hours = (jwTitleEN.runtime / 60);
                    let rhours = Math.floor(hours);
                    let minutes = (hours - rhours) * 60;
                    let rminutes = Math.round(minutes);
                    embedRuntimeValue = `${rhours}:${rminutes < 10 ? `0${rminutes}` : rminutes}`;
            }

                // Rating
                jwTitleEN.scoring.map(score => {
                    if (score.provider_type === 'imdb:score')
                        embedRatingValue.imdb = `|| ${score.value} ||` || 'Not Found';
                    else if (score.provider_type === 'tmdb:score')
                        embedRatingValue.tmdb = `|| ${score.value} ||` || 'Not Found';
                    else null
                });
            }
            else {
                embedTitleValue = `${jwTitleBR.title} (${jwTitleBR.original_release_year})`;
                embedURLValue = `https://justwatch.com${jwTitleBR.full_path}`;
                embedImageValue = `https://images.justwatch.com${jwTitleBR.poster.replace('{profile}', 's592')}`;
                embedPlotValue = jwTitleBR.short_description || 'Not Found'

                // Genre
                embedGenreValue = jwTitleBR.genre_ids.map(genreArray => {
                    return jwGenresBR.find(genre => genreArray === genre.id).translation
                }).join(' | ') || 'Not Found';

                // Where to watch
                embedWhereToWatchValue = jwTitleBR.offers ? jwTitleBR.offers.map(offer => {
                    let offerRtn = jwProvidersBR.find(provider => provider.id === offer.provider_id);
                    return `[${offerRtn.clear_name}](${offer.urls.standard_web})`;
                }).join(' | ') || 'Not Found' : 'Not Found';

                // Director
                embedDirectorValue = jwTitleBR.credits.map(credit => {
                    if (credit.role === 'DIRECTOR') return credit.name
                }) || 'Not Found';

                // Runtime
                if (jwTitleBR.runtime) {
                    let hours = (jwTitleBR.runtime / 60);
                    let rhours = Math.floor(hours);
                    let minutes = (hours - rhours) * 60;
                    let rminutes = Math.round(minutes);
                    embedRuntimeValue = `${rhours}:${rminutes < 10 ? `0${rminutes}` : rminutes}`;
            }

                // Rating
                jwTitleBR.scoring.map(score => {
                    if (score.provider_type === 'imdb:score')
                        embedRatingValue.imdb = `|| ${score.value} ||` || 'Not Found';
                    else if (score.provider_type === 'tmdb:score')
                        embedRatingValue.tmdb = `|| ${score.value} ||` || 'Not Found';
                    else null
                });
            }

            // Send Embed
            await jwMessage.edit('', new Discord.MessageEmbed()
                // Original title + (release year) - The Lodge (2020)
                .setTitle(embedTitleValue)
                // JustWatch URL
                .setURL(embedURLValue)
                .setColor(0x3498DB)
                // Movie poster
                .setImage(embedImageValue)
                .addFields(
                    {
                        // Synopse
                        name: 'Plot',
                        value: embedPlotValue
                    },
                    {
                        // Genres
                        name: 'Genre',
                        value: embedGenreValue
                    },
                    {
                        name: 'Directed by',
                        value: embedDirectorValue,
                        inline: true
                    },
                    {
                        name: 'Runtime',
                        value: embedRuntimeValue,
                        inline: true
                    },
                    {
                        name: 'Where to watch',
                        value: embedWhereToWatchValue
                    },
                    {
                        name: 'IMDB',
                        value: embedRatingValue.imdb,
                        inline: true
                    },
                    {
                        name: 'TMDB',
                        value: embedRatingValue.tmdb,
                        inline: true
                    },
                    {
                        name: 'Torrent',
                        value: jwTorrentField
                    },
                )
            );
            break;
        case 'donato':
            message.channel.send(donato[Math.floor(Math.random() * donato.length)]);
            break;
        default:
            message.channel.send('Invalid command. See \`!help\` for the list of commands.');
            break;
    }

    // Logs stuff
    console.log(`\n${message.author.username} executed '${command}' ${args != "" ? `with "${messageText}"` : ""}`);
    logMessage ? console.log(logMessage) : null;
});

client.login(token);
