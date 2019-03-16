const fs = require('fs');
const Discord = require('discord.js');

const client = new Discord.Client();

const config = require('./config.json');
const snm = require('./snm.json');
const lastSnm = snm[snm.length - 1];

const snmEmbed = () => {
    let description = 'Status: **' + lastSnm.status + '**\n\n';
    let printArray = [];

    // Builds list ordered by titleKey
    for (userIndex in lastSnm.users ){
        for (movieIndex in lastSnm.users[userIndex].movies)
            printArray[lastSnm.users[userIndex].movies[movieIndex].titleKey - 1] = [`${lastSnm.users[userIndex].movies[movieIndex].titleKey}) ${lastSnm.users[userIndex].movies[movieIndex].title}\n`]
    }

    description += printArray.join("") + `\n\`!snmAdd <movie name>\` to add`
    
    const embed = new Discord.RichEmbed()
        // Set the title of the field
        .setTitle(`🌟 Sunday Night Movie ${snm[snm.length - 1].week} 🌟`)
        // Set the color of the embed
        .setColor(0xFF0000)
        // Set the main content of the embed
        .setDescription(description);
    // Returns the embed
    return embed;
}

client.on('ready', () => {
    // This event will run if the bot starts, and logs in, successfully.
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    // Example of changing the bot's playing game to something useful. `client.user` is what the
    // docs refer to as the "ClientUser".
    client.user.setActivity(`Beep boop`);
});


client.on('message', async message => {

    // If message is from another bot, ignore
    if (message.author.bot) return;

    // If message does not contain prefix, ignore
    if (message.content.indexOf(config.prefix) !== 0) return;

    // Separate message from prefix
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // To get the "message" itself we join the `args` back into a string with spaces: 
    const messageText = args.join(" ");

    let logMessage = "";

    switch (command) {
        case 'help':
            let description = `!ping - Pings the API
                
                !say <message> - Makes the bot say something
                
                !snm - Lists this week's Sunday Night Movie™
                
                !snmAdd <movie title> - Adds a movie to this week's pool

                !snmRemove <movie title or number> - Removes a movie from the week's pool

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
            message.channel.send(snmEmbed());
            break;
        case 'snmadd':
            let authorId = message.author.id;
            // Checks if user is already on the list
            let userObject = lastSnm.users.find((user) => user.userId === authorId);

            if (userObject) {
                // Check user entries
                if (userObject.movies.length === 2)
                    message.channel.send(`You have no entries left.\nRemove entries with \`!snmRemove <movie title or number>\`.`);
                    logMessage = "No entries left";
                    break;
            }
            // Add user to the list if new
            else
                userObject = lastSnm.users[lastSnm.users.push({userId: authorId, username: message.author.username, movies: []}) - 1]
            
            // If movie is already on the list, cancel and inform user
            if (lastSnm.users.find((user) => user.movies.find((movie) => movie.title === messageText))){
                message.channel.send("Movie already on the list");
                logMessage = "Movie was already on the list";
                break;
            }

            // Adds movie to the list
            lastSnm.movieCount++
            lastSnm.users[lastSnm.users.indexOf(userObject)].movies.push({title: messageText, titleKey: lastSnm.movieCount});

            fs.writeFile('snm.json', JSON.stringify(snm), (err) => {
                if (err) {
                    message.channel.send(err);
                    logMessage = err;
                    throw err;
                }
                else {
                    message.channel.send(`Added \`${messageText}\` to the list`);
                    message.channel.send(snmEmbed())
                }
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
            for (userIndex in lastSnm.users){
                for (movieIndex in lastSnm.users[userIndex].movies){
                    if (lastSnm.users[userIndex].movies[movieIndex].title === messageText){
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
            if (deleted){
                deleted = deleted[0]
                lastSnm.movieCount--;
                for (userIndex in lastSnm.users){
                    for (movieIndex in lastSnm.users[userIndex].movies){
                        if (lastSnm.users[userIndex].movies[movieIndex].titleKey > deleted.titleKey)
                            lastSnm.users[userIndex].movies[movieIndex].titleKey--
                    }
                }

                fs.writeFile('snm.json', JSON.stringify(snm), (err) => {
                    if (err) {
                        message.channel.send(err)
                        logMessage = err;
                        throw err;
                    }
                    else {
                        message.channel.send(`Removed \`${deleted.title}\` from the list`);
                        message.channel.send(snmEmbed())
                    }
                });
                logMessage = `${message.author.username} removed '${deleted.title}' from the list`;
            }
            else 
                message.channel.send(`Movie not found.\n\`\`\`Usage: !snmRemove <movie title or number>\n!snm to see the list\`\`\``);            
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
            message.author.send('Invalid command. See \`!help\` for the list of commands.');
            break;
    }

    // Logs stuff
    console.log(`\n${message.author.username} executed '${command}' ${args != "" ? `with "${messageText}"` : ""}`);
    console.log(logMessage);
});

client.login(config.token);