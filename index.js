const fs = require('fs');
const Discord = require('discord.js');

const client = new Discord.Client();

const config = require('./config.json');
const snm = require('./snm.json');

const snmEmbed = () => {

    let lastSnm = snm[snm.length - 1]

    let description = `Status: **${lastSnm.status}**\n\n - ${lastSnm.movies.join('\n - ')}`

    const embed = new Discord.RichEmbed()
        // Set the title of the field
        .setTitle(`🌟 Sunday Night Movie ${snm[snm.length - 1].week} 🌟`)
        // Set the color of the embed
        .setColor(0xFF0000)
        // Set the main content of the embed
        .setDescription(description);
    // Returns the embed
    return embed
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

    // Let's go with a few common example commands! Feel free to delete or change those.

    if (command === 'ping') {
        // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
        const m = await message.channel.send('Ping?');
        m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
    }

    if (command === 'say') {
        // Makes the bot say something and delete the message. As an example, it's open to anyone to use. 
        // To get the "message" itself we join the `args` back into a string with spaces: 
        const sayMessage = args.join(' ');
        // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
        message.delete().catch(O_o => { });
        // And we get the bot to say the thing: 
        message.channel.send(sayMessage);
    }

    if (command === 'snm') {
        message.channel.send(snmEmbed());
    }

    if (command === 'snmadd') {
        let lastSnm = snm[snm.length - 1];
        // Adds movie recommendation to the list
        const movieName = args.join(' ');
        lastSnm.movies.push(movieName);
        fs.writeFile('snm.json', JSON.stringify(snm));
        message.channel.send(snmEmbed());
    }

    //TODO:
    if (command === 'clear') {

        if (message.channel.type != 'TextChannel')
            return;

        if (message.guild.name === 'Guizzorde Test') {
            message.channel.fetchMessages()
                .then((list) => {
                    message.channel.bulkDelete(list);
                })
        }

    }
});

client.login(config.token);