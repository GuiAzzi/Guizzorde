const fs = require('fs');
const Discord = require('discord.js');
const mongodb = require('mongodb');
const randomEmoji = require('./src/random-emoji.js');

// config.json - for running locally
const config = fs.existsSync('./src/config.json') ? require('./src/config.json') : null;

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

const client = new Discord.Client();

/**
 * Saves the snmFile from snm variable
 * @param {function} callback - A function to be called after saving the file
 */
function saveSnmFile(callback) {
    mongodb.MongoClient.connect(uri, { useNewUrlParser: true }, (err, mongoClient) => {
        if (err) {
            client.users.get(ownerId).send(err);
            throw err;
        }

        mongoClient.db(herokuDb).collection(collection).replaceOne({ week: lastSnm.week }, lastSnm, (err, result) => {
            if (err) {
                client.users.get(ownerId).send(err);
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
            client.users.get(ownerId).send(err);
            throw err;
        }

        mongoClient.db(herokuDb).collection(collection).insertOne(newSnm, (err, result) => {
            if (err) {
                client.users.get(ownerId).send(err);
                throw err;
            }

            lastSnm = result.ops[0];
            callback();
            mongoClient.close();
        });
    });
}

function snmEmbed() {
    let description = 'Status: **' + lastSnm.status + '**\n\n';
    let footer = "";
    let printArray = [];

    // If status is finished, prints winner;
    if (lastSnm.status === "finished" && lastSnm.winner)
        description += `Winner: **${lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === lastSnm.winner)).movies.find(movie => movie.titleKey === lastSnm.winner).title}**\n\n`;

    // Builds list ordered by titleKey
    for (userIndex in lastSnm.users) {
        for (movieIndex in lastSnm.users[userIndex].movies)
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

    let embed = new Discord.RichEmbed()
        // Set the title of the field
        .setTitle(`🌟 Sunday Night Movie ${lastSnm.week} 🌟`)
        // Set the color of the embed
        .setColor(0xFF0000)
        // Set the main content of the embed
        .setDescription(description + printArray.join(""))
        // Set the footer text
        .setFooter(footer)
    // Returns the embed
    return embed;
}

client.on('ready', () => {
    // This event will run if the bot starts, and logs in, successfully.
    console.log(`${client.user.username} has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    // Example of changing the bot's playing game to something useful. `client.user` is what the
    // docs refer to as the "ClientUser".
    client.user.setActivity(`Beep boop`);
    client.users.get(ownerId).send("I got booted!");

    mongodb.MongoClient.connect(uri, { useNewUrlParser: true }, (err, mongoClient) => {
        if (err) {
            client.users.get(ownerId).send(err);
            throw err;
        }

        mongoClient.db(herokuDb).collection(collection).findOne({}, { sort: { $natural: -1 } }, (err, result) => {
            if (err) {
                mongoClient.users.get(ownerId).send(err);
                throw err;
            }

            lastSnm = result;

            // if there is a vote going on, add voting message to cache
            if (lastSnm.voteMessage) {
                client.channels.get(lastSnm.voteMessage.channelId).fetchMessage(lastSnm.voteMessage.messageId).then((msg) => {
                    msg.edit();
                });
            }

            mongoClient.close();
        });
    });
});

// client.on('raw', event => {
//     if (!lastSnm || lastSnm.status != 'voting') return;

//     let channel = client.channels.get(lastSnm.voteMessage.channelId);

//     if (channel.messages.has(lastSnm.voteMessage.messageId)) return;    

//     if (event.t === 'MESSAGE_REACTION_ADD' && event.d.message_id === lastSnm.voteMessage.messageId)
// 	    console.log('\nRaw event data:\n', event);
// });

client.on('error', (error) => {
    console.log(error)
    client.users.get(ownerId).send(error);
});

client.on('messageReactionAdd', (reaction, user) => {
    if (reaction.message.id === lastSnm.voteMessage.messageId) {
        // Reactions from bot, allow
        if (user.id !== client.user.id) {
            // TODO: Emoji vote system :O
            if (reaction.users.find(userIndex => userIndex.id === user.id)) {
                reaction.remove(user);

                let userObject = lastSnm.users.find(userIndex => userIndex.userId === user.id)
                let movieTitleKey = lastSnm.emojisUsed.find(emoji => emoji.emoji === reaction.emoji.identifier || emoji.emoji === reaction.emoji.name).titleKey;

                // user is not on the list yet
                if (!userObject) {
                    userObject = lastSnm.users[lastSnm.users.push({ userId: user.id, username: user.username, movies: [], votes: [] }) - 1];
                    console.log(`Added user ${user.username}`);
                }
                // user already voted on that movie
                else if (userObject.votes.includes(movieTitleKey)) return
                // valid vote
                else if (userObject.votes.length < 2) {
                    let movieTitle = lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === movieTitleKey)).movies.find(movie => movie.titleKey === movieTitleKey).title;
                    userObject.votes.push(movieTitleKey);
                    client.users.get(user.id).send(`You voted on \`${movieTitle}\``);
                    saveSnmFile(() => { });
                    console.log(`${user.username} voted. ${userObject.votes.length}/2`);
                }
                // no votes left
                else {
                    client.users.get(user.id).send(`You have no votes left. Type \`!snmVotes clear\` to reset all your votes.`);
                    console.log(`No votes left`);
                }
            }
        }
    }
});

client.on('message', async message => {

    // If message is from another bot, ignore
    if (message.author.bot) return;

    // If message does not contain prefix, ignore
    if (message.content.indexOf(prefix) !== 0) return;

    // Separate message from prefix
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // To get the "message" itself we join the `args` back into a string with spaces: 
    const messageText = args.join(" ");

    let logMessage = "";

    switch (command) {
        case 'help':
            let description =
                `!ping - Pings the API
                \n!say <message> - Makes the bot say something
                \n!snm [week number]:optional - Show this week's movies or specified week summary
                \n!snmNew - Starts a new week of SNM™
                \n!snmStart - Initiate voting
                \n!snmVotes [clear]:optional - See your votes or clear them
                \n!snmEnd <winner title or position> - Ends voting and declares winner
                \n!snmAdd <movie title> - Adds a movie to this week's pool
                \n!snmRemove <movie title or number> - Removes a movie from the week's pool
                \n!snmRate <text> - Leaves a rating note for this week's movie
                \n!snmExport [week number]:optional - Creates a text file with all SNM™ data
                \n!clear - 👀 ||don't||`;

            const embed = new Discord.RichEmbed()
                // Set the title of the field
                .setTitle(`Guizzorde Commands`)
                // Set the color of the embed
                .setColor('#4286f4')
                // Set the main content of the embed
                .setDescription(description);
            message.author.send(embed);
            break;
        case 'ping':
            // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
            const m = await message.channel.send('Ping?');
            m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
            break;
        case 'say':
            // Makes the bot say something and delete the message. As an example, it's open to anyone to use. 
            // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
            message.delete().catch(O_o => { });
            // And we get the bot to say the thing: 
            message.channel.send(messageText);
            break;
        case 'snm':
            // Sends rich embed with SNM infos
            // If no week was specified or if specified week is current one
            if (!messageText.trim() || Number(messageText.trim()) === lastSnm.week) {
                message.channel.send(snmEmbed());
                break;
            }
            else if (!Number(messageText.trim()) || Number(messageText.trim()) > lastSnm.week) {
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
                        client.users.get(ownerId).send(err);
                        throw err;
                    }

                    mongoClient.db(herokuDb).collection(collection).findOne({ week: Number(messageText) }, (err, result) => {
                        if (err) {
                            mongoClient.users.get(ownerId).send(err);
                            throw err;
                        }

                        let specifiedSnm = result;
                        let printArray = [];
                        let tempMovies = [];

                        // runs through week and get movies, winner and ratings
                        // let description = `Summary of Sunday Night Movie ${specifiedSnm.week}`;
                        let description = `Status: **${specifiedSnm.status}**\n`;
                        for (userIndex in specifiedSnm.users) {
                            printArray[userIndex] = `${specifiedSnm.users[userIndex].username} - \n`;
                            // checks if user has movies and add it to printArray in the position of title key (to print in order in the end)
                            if (specifiedSnm.users[userIndex].movies) {
                                for (movieIndex in specifiedSnm.users[userIndex].movies) {
                                    // if movie is the winner, add to description text
                                    if (specifiedSnm.users[userIndex].movies[movieIndex].titleKey === specifiedSnm.winner)
                                        description += `Winner: **${specifiedSnm.users[userIndex].movies[movieIndex].title}**\n\n`;
                                    tempMovies.push(`\`${specifiedSnm.users[userIndex].movies[movieIndex].title}\``);
                                }
                            }
                            printArray[userIndex] += `${tempMovies.length > 0 ? `Movies: ${tempMovies.join(" | ")}\n` : ""}${specifiedSnm.users[userIndex].rating ? `Rating: ${specifiedSnm.users[userIndex].rating}\n\n` : ""}`;
                            tempMovies = [];
                        }

                        let embed = new Discord.RichEmbed()
                            // Set the title of the field
                            .setTitle(`🧾 Summary of Sunday Night Movie ${specifiedSnm.week} 🧾`)
                            // Set the color of the embed
                            .setColor(0xFF0000)
                            // Set the main content of the embed
                            .setDescription(description + printArray.join(""));
                        // Returns the embed

                        mongoClient.close();
                        m.edit(embed);
                    });
                });
            }

            break;
        case 'snmnew':
            // Can only start a new SNM if last one is finished
            if (lastSnm.status != "finished") {
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

            insertNewSnm(newSnm, () => {
                let crewRole
                if (message.channel.guild)
                    crewRole = message.guild.roles.find((role) => role.name === "Crew");
                message.channel.send(`${crewRole ? "<@&" + crewRole.id + "> " : ""}\n\`Sunday Night Live ${lastSnm.week}\` requests are now open!\n\`!snmAdd <movie name>\` to request a movie.`);
            })

            logMessage = `SNM ${lastSnm.week + 1} started`;

            break;
        case 'snmstart':
            // Starts voting system

            // can only be done by owner - for now.
            if (message.author.id != ownerId) {
                message.channel.send(`You can't do that. Ask my lovely master. 🌵`);
                logMessage = "Author is not owner"
                break;
            }
            else if (!message.guild) {
                message.channel.send("You can't start a vote for yourself. Use it in a server. 🤔");
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
                message.channel.send(`\`SNM ${lastSnm.week}\` is finished.\nYou can start another one with \`!snmNew.\``);
                logMessage = "SNM is finished";
                break;
            }

            lastSnm.status = 'voting';
            message.delete().catch(O_o => { });

            // Check for Crew role
            let crewRole;
            if (message.channel.guild)
                crewRole = message.guild.roles.find((role) => role.name === "Crew");

            message.channel.send(`${crewRole ? "<@&" + crewRole.id + "> " : ""}\nGather round, voting has started 😱`);
            let voteMessage = await message.channel.send(new Discord.RichEmbed().setTitle(`🛠 Building... 🛠`));
            // need to save the message id in case bot crashes
            lastSnm.voteMessage = { channelId: voteMessage.channel.id, messageId: voteMessage.id };

            // Builds rich embed with a random emoji for each movie
            let printArray = [];
            let emojiArray = message.guild.emojis;
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
            let votingEmbed = new Discord.RichEmbed()
                .setTitle(`🌟 Sunday Night Movie ${lastSnm.week} 🌟`)
                .setColor(0xFF0000)
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

            if (userFound.votes.length === 0) {
                message.channel.send(`You have not voted yet`);
                logMessage = `No votes`;
            }
            else if (messageText.trim() === "clear") {
                userFound.votes = [];
                logMessage = `Votes reset`;
                saveSnmFile(() => { 
                    message.channel.send(`Your votes have been reset`);
                });
            }
            else {
                let moviesVoted = [];
                userFound.votes.forEach(movieTitleKey => {
                    moviesVoted.push(`\`${lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === movieTitleKey)).movies.find(movie => movie.titleKey === movieTitleKey).title}\``);
                });
                message.channel.send(`Your votes: ${moviesVoted.join(" | ")}`);
            }

            break;
        case 'snmend':
            let winnerMovie;

            // can only be done by owner - for now.
            if (message.author.id != ownerId) {
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
            else if (messageText.trim() != "") {
                winnerMovie = lastSnm.users.find(user => user.movies.find(movie => movie.title === messageText))
                    || lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === Number(messageText)));
                if (winnerMovie)
                    winnerMovie = winnerMovie.movies.find(movie => movie.title === messageText)
                        || winnerMovie.movies.find(movie => movie.titleKey === Number(messageText))

                if (!winnerMovie) {
                    message.channel.send(`Movie not found`);
                    logMessage = `${messageText} was not found`;
                    break;
                }
            }
            // if no movie was passed
            else {
                // TODO:
                let allVotes = [];

                message.channel.send(`Automatic vote count is being implemented`);
                break;                
                // message.channel.send(`Did you forgot to type the movie?\n\`!snmEnd <winner title or position>\``);
                // logMessage = `No winned typed`;
                // break;
            }

            message.delete().catch(O_o => { });
            lastSnm.winner = winnerMovie.titleKey;
            lastSnm.status = "finished";
            saveSnmFile(() => {
                message.channel.send(`🥁 And the winner is`)
                    .then(m => m.edit(`And 🥁 the winner is`)
                        .then(m => m.edit(`And the 🥁 winner is`)
                            .then(m => m.edit(`And the winner 🥁 is`)
                                .then(m => m.edit(`And the winner is 🥁`)
                                    .then(m => m.edit((`And the winner is: **${winnerMovie.title}**`)))))));
            });
            logMessage = `Winner is ${winnerMovie.title}`;

            break;
        case 'snmadd':
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
                if (userObject.movies.length === 2) {
                    message.channel.send(`You have no entries left.\nRemove entries with \`!snmRemove <movie title or number>\`.`);
                    logMessage = `No entries left ${userObject.movies.length}/2`;
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
            for (userIndex in lastSnm.users) {
                for (movieIndex in lastSnm.users[userIndex].movies) {
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
                for (userIndex in lastSnm.users) {
                    for (movieIndex in lastSnm.users[userIndex].movies) {
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

            let specifiedWeek = Number(messageText.trim()) || null;

            // User entered text (not number) or a future week
            if (messageText.trim() && !specifiedWeek || Number(messageText.trim()) > lastSnm.week) {
                message.channel.send(`\`${messageText.trim()}\` is not a valid week\nType \`!snmExport [week number]:optional\` to export a file`);
                logMessage = `${messageText} is not a valid week`;
                break;
            }
            // If we got a number as argument, user specified a week
            else if (specifiedWeek && specifiedWeek <= lastSnm.week) {
                let m = await message.channel.send(`Exporting...`);
                mongodb.MongoClient.connect(uri, { useNewUrlParser: true }, (err, mongoClient) => {
                    if (err) {
                        client.users.get(ownerId).send(err);
                        throw err;
                    }

                    mongoClient.db(herokuDb).collection(collection).findOne({ week: specifiedWeek }, (err, result) => {
                        if (err) {
                            mongoClient.users.get(ownerId).send(err);
                            throw err;
                        }
                        mongoClient.close();

                        // Exports specific snm.json as file
                        fs.writeFileSync(`SNM${specifiedWeek}.txt`, JSON.stringify(result, null, 2));
                        const buffer = fs.readFileSync(`./SNM${specifiedWeek}.txt`)
                        const attachment = new Discord.Attachment(buffer, `SNM${specifiedWeek}.txt`);
                        m.delete(O_o => { });
                        message.reply(attachment);
                    });
                });
                break;
            }

            // Exports snm.json as file
            fs.writeFileSync(`SNM${lastSnm.week}.txt`, JSON.stringify(lastSnm, null, 2));
            const buffer = fs.readFileSync(`./SNM${lastSnm.week}.txt`)
            const attachment = new Discord.Attachment(buffer, `SNM${lastSnm.week}.txt`);
            message.reply(attachment);
            break;
        case 'clear':
            //TODO:

            let meme = ["https://cdn.discordapp.com/attachments/168624317049995264/557765021359276043/VghsxturtIjzwLuU.mp4"];

            message.author.send(`You bad, BAD person 😤\n${meme[Math.floor(Math.random() * meme.length)]}`);
            // if (command === 'clear') {

            //     if (message.channel.type != 'TextChannel')
            //         return;

            //     if (message.guild.name === 'Guizzorde Test') {
            //         message.channel.fetchMessages()
            //             .then((list) => {
            //                 message.channel.bulkDelete(list);
            //             });
            //     }
            // }            
            break;
        default:
            message.channel.send('Invalid command. See \`!help\` for the list of commands.');
            break;
    }

    // Logs stuff
    console.log(`\n${message.author.username} executed '${command}' ${args != "" ? `with "${messageText}"` : ""}`);
    logMessage ? console.log(logMessage) : null
});

client.login(token);