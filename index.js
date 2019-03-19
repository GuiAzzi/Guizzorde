const fs = require('fs');
const Discord = require('discord.js');
const mongodb = require('mongodb');
const randomEmoji = require('./src/random-emoji.js');

// config.json - for running locally
const config = fs.existsSync('./src/config.json') ? require('./src/config.json') : null;

// Bot token
const token = process.env.TOKEN ? process.env.TOKEN : config.token;
// OwnerID
const ownerId = process.env.OWNER_ID ? process.env.OWNER_ID : config.ownerId;
// Message prefix
const prefix = process.env.PREFIX ? process.env.PREFIX : config.prefix;
// MongoDB URI
let uri = process.env.MONGODB_URI ? process.env.MONGODB_URI : config.mongodb;
// the last snm collection
let lastSnm;

const client = new Discord.Client();

// Keep track of this because something is happening to this message
let activeMessage = null;

/**
 * Saves the snmFile from snm variable
 * @param {function} callback - A function to be called after saving the file
 */
function saveSnmFile(callback) {
    mongodb.MongoClient.connect(uri, {useNewUrlParser: true}, (err, mongoClient) => {
        if (err) {
            client.users.get(ownerId).send(err);
            throw err;
        }

        mongoClient.db('heroku_6zd3qncp').collection('snm').replaceOne({week: lastSnm.week}, lastSnm, (err, result) => {
            if (err) {
                mongoClient.users.get(ownerId).send(err);
                throw err;
            }

            lastSnm = result.ops[0];
            callback();
        });
        mongoClient.close();
    });
}

const insertNewSnm = (newSnm, callback) => {
    mongodb.MongoClient.connect(uri, {useNewUrlParser: true}, (err, mongoClient) => {
        if (err) {
            client.users.get(ownerId).send(err);
            throw err;
        }

        mongoClient.db('heroku_6zd3qncp').collection('snm').insertOne(newSnm, (err, result) => {
            if (err) {
                mongoClient.users.get(ownerId).send(err);
                throw err;
            }

            lastSnm = result.ops[0];
            callback();
        });
        mongoClient.close();
    });
}

const snmEmbed = () => {
    let description = 'Status: **' + lastSnm.status + '**\n\n';
    let footer = "";
    let printArray = [];

    // If status is finished, prints winner;
    if(lastSnm.status === "finished" && lastSnm.winner)    
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
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    // Example of changing the bot's playing game to something useful. `client.user` is what the
    // docs refer to as the "ClientUser".
    client.user.setActivity(`Beep boop`);
    client.users.get(ownerId).send("I got booted!");

    mongodb.MongoClient.connect(uri, {useNewUrlParser: true}, (err, mongoClient) => {
        if (err) {
            client.users.get(ownerId).send(err);
            throw err;
        }

        mongoClient.db('heroku_6zd3qncp').collection('snm').findOne({}, {sort:{$natural: -1}}, (err, result) => {
            if (err) {
                mongoClient.users.get(ownerId).send(err);
                throw err;
            } 
                
            lastSnm = result;
        });
        mongoClient.close();
    });
});

client.on('messageReactionAdd', (reaction, user) => {
    if (reaction.message === activeMessage) {
        // Reactions from bot, allow
        if (user.id !== activeMessage.author.id) {
            // TODO: Emoji vote system :O
            // if (reaction.users.find(userIndex => userIndex.id === user.id )){
            //     reaction.remove(user);
            // }
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
                
                !say <message> - Makes the bot say something
                
                !snm [week number] - Lists this week's SNM™ [optional: show summary for specified week]

                !snmNew - Starts a new week of SNM™

                !snmStart - Initiate voting

                !snmEnd <winner title or position> - Ends voting and declares winner
                
                !snmAdd <movie title> - Adds a movie to this week's pool

                !snmRemove <movie title or number> - Removes a movie from the week's pool

                !snmRate <text> - Leaves a rating note for this week's movie

                !snmExport - Creates a text file with all SNM data

                !clear - 👀 ||don't||`;

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

            // if no week was specified, show current snm requested movies
            if (!messageText.trim())
                message.channel.send(snmEmbed());
            else {
                // If snm specified is current one, show normal snm
                if (Number(messageText.trim()) === lastSnm.week){
                    message.channel.send(snmEmbed());
                    break;
                }
                // If a week was specified, show that SNM with winner and user ratings
                else if (!Number(messageText.trim()) || Number(messageText.trim()) > lastSnm.week){
                    // User entered text or a week bigger than current one
                    message.channel.send(`Thats not a valid week`);
                    logMessage = `Invalid week`;
                    break;
                }

                mongodb.MongoClient.connect(uri, {useNewUrlParser: true}, (err, mongoClient) => {
                    if (err) {
                        client.users.get(ownerId).send(err);
                        throw err;
                    }
            
                    mongoClient.db('heroku_6zd3qncp').collection('snm').findOne({week: Number(messageText)}, (err, result) => {
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
                        for (userIndex in specifiedSnm.users){
                            printArray[userIndex] = `${specifiedSnm.users[userIndex].username} - \n`;
                            // checks if user has movies and add it to printArray in the position of title key (to print in order in the end)
                            if (specifiedSnm.users[userIndex].movies){
                                for (movieIndex in specifiedSnm.users[userIndex].movies){
                                    // if movie is the winner, add to description text
                                    if (specifiedSnm.users[userIndex].movies[movieIndex].titleKey === specifiedSnm.winner)
                                        description += `Winner: **${specifiedSnm.users[userIndex].movies[movieIndex].title}**\n\n`;
                                    tempMovies.push(`\`${specifiedSnm.users[userIndex].movies[movieIndex].title}\``);
                                }
                            }
                            printArray[userIndex] += `  Movies: ${tempMovies.join(" | ")}\n  Rating: ${specifiedSnm.users[userIndex].rating}\n\n`;
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

                        message.channel.send(embed);
                    });
                    mongoClient.close();
                });                
            }

            break;
        case 'snmnew':
            // Can only start a new SNM if last one is finished
            if (lastSnm.status != "finished"){
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
            if (message.author.id != ownerId){
                message.channel.send(`You can't do that. Ask my lovely master. 🌵`);
                logMessage = "Author is not owner"
                break;
            }
            // can only be used in Top Server BR and Guizzorde Test
            else if (message.guild.id !== "84290462843670528" && message.guild.id !== "556216789688909834") {
                message.channel.send("This can't be used in this server. 💋");
                logMessage = "Wrong guild";
                break;
            }
            else if (lastSnm.status === "voting"){
                message.channel.send(`\`SNM ${lastSnm.week} voting has already started!`);
                logMessage = "SNM voting already started";
                break;
            }
            // Cannot start voting if lastSnm is finished
            else if (lastSnm.status === "finished"){
                message.channel.send(`\`SNM ${lastSnm.week}\` is finished.\nYou can start another one with \`!snmNew.\``);
                logMessage = "SNM is finished";
                break;
            }

            lastSnm.status = 'voting';
            message.delete().catch(O_o => { });

            saveSnmFile(() => {
                // Check for Crew role
                let crewRole;
                if (message.channel.guild)
                    crewRole = message.guild.roles.find((role) => role.name === "Crew");
                message.channel.send(`${crewRole ? "<@&" + crewRole.id + "> " : ""}\nGather round, voting has started 😱`);

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
                            emojisUsed.push(rndEmoji);
                            emojiArray.delete(rndEmoji.id);
                        }
                        // It will break if there are more movies than custom emojis
                        else {
                            rndEmoji = randomEmoji();
                            printArray[movie.titleKey - 1] = `${rndEmoji} - ${movie.title}\n`;
                            emojisUsed.push(rndEmoji);
                        }
                    })
                });

                // Create the embed with titles, emojis and reactions
                let votingEmbed = new Discord.RichEmbed()
                    .setTitle(`🌟 Sunday Night Movie ${lastSnm.week} 🌟`)
                    .setColor(0xFF0000)
                    .setDescription(printArray.join(" "))
                    .setFooter('Click the corresponding reaction to vote!');

                message.channel.send(votingEmbed).then(async msg => {
                    activeMessage = msg;
                    for (let i = 0; i < emojisUsed.length; i++) {
                        await msg.react(emojisUsed[i])
                    }
                });
            })
            break;
        case 'snmend':
            // can only be done by owner - for now.
            if (message.author.id != ownerId){
                message.channel.send(`You can't do that. Ask my lovely master. 🌵`);
                logMessage = "Author is not owner"
                break;
            }
            // Can only be ended if status is voting or if requester is owner
            else if (lastSnm.status !== "voting" && message.author.id !== ownerId){
                message.channel.send(`SNM cannot be ended. It is \`${lastSnm.status}\``);
                logMessage = `SNM is ${lastSnm.status}`;
                break;
            }
            else {
                // Gets movie by title or titleKey, whoever comes first

                // if no movie was passed
                if (messageText.trim() === ""){
                    message.channel.send(`Did you forgot to type the movie?\n\`!snmEnd <winner title or position>\``);
                    logMessage = `No winned typed`;
                    break;
                }
                
                let movieFound = lastSnm.users.find(user => user.movies.find(movie => movie.title === messageText)) 
                || lastSnm.users.find(user => user.movies.find(movie => movie.titleKey === Number(messageText)));
                if (movieFound)
                    movieFound = movieFound.movies.find(movie => movie.title === messageText) 
                    || movieFound.movies.find(movie => movie.titleKey === Number(messageText)) 
                
                if (!movieFound) {
                    message.channel.send(`Movie not found`);
                    logMessage = `${messageText} was not found`;
                    break;
                }
                else {
                    message.delete().catch(O_o => {});
                    lastSnm.winner = movieFound.titleKey;
                    lastSnm.status = "finished";
                    saveSnmFile(() => {
                        message.channel.send(`🥁 And the winner is`)
                        .then(m => m.edit(`And 🥁 the winner is`)
                        .then(m => m.edit(`And the 🥁 winner is`)
                        .then(m => m.edit(`And the winner 🥁 is`)
                        .then(m => m.edit(`And the winner is 🥁`)
                        .then(m => m.edit((`And the winner is: **${movieFound.title}**`)))))));
                    });
                    logMessage = `Winner is ${movieFound.title}`;
                }
            }

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
            // Add user to the list if new
            else
                userObject = lastSnm.users[lastSnm.users.push({ userId: authorId, username: message.author.username, movies: [] }) - 1]

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
            if (lastSnm.status !== "finished"){
                message.channel.send(`\`Sunday Night Movie ${lastSnm.week}\` is still \`${lastSnm.status}\``);
                logMessage = `SNM ${lastSnm.week} is ${lastSnm.status}`;
                break;
            }
            else {
                let userObject = lastSnm.users.find((user) => user.userId === message.author.id);

                // If new user
                if (!userObject)
                    userObject = lastSnm.users[lastSnm.users.push({ userId: message.author.id, username: message.author.username, movies: [] }) - 1]
    
                userObject.rating = messageText;

                saveSnmFile(() => {
                    message.channel.send(`Your rating was updated.`);
                });

                logMessage = (`${message.author.username}'s rating was updated to: ${messageText}`);
            }
            break;
        case 'snmexport':
            // TODO: export especific week
            // Exports snm.json as file
            fs.writeFileSync(`SNM${lastSnm.week}.txt`, JSON.stringify(lastSnm, null, 2));
            const buffer = fs.readFileSync(`./SNM${lastSnm.week}.txt`)
            const attachment = new Discord.Attachment(buffer, `SNM${lastSnm.week}.txt`);
            message.reply(attachment);
            break;
        case 'clear':
            //TODO:
            message.author.send('You bad, BAD person 😤');
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