import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
} from 'discord.js';
import * as chrono from 'chrono-node';
import { CronJob, CronTime } from 'cron';
import { Message } from 'discord.js';
import {
	GuizzordeReminder,
	Reminders,
	upsertReminder,
	getSubscribedUsers,
	getReminderList,
	getNextReminder,
	getLastReminder,
	getUserSubscriptionList,
	getReminder,
} from './index.js';
import { client } from '../../../config/index.js';
import { reportError } from '../../../util/index.js';

export const remindMeCommand = {
	data: new SlashCommandBuilder()
		.setName('remindme')
		.setDescription(
			'Set a new reminder! Reminders created via DM\'s are always private.',
		)
		.addStringOption((option) =>
			option
				.setName('note')
				.setDescription('What would you like to be reminded of?')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('date')
				.setDescription(
					'When would you want to be reminded? | Ex: "Tomorrow", "In five days", "17 August 2013"',
				)
				.setRequired(true),
		)
		.addBooleanOption((option) =>
			option
				.setName('private')
				.setDescription(
					'Whether other people can see and subscribe to this reminder',
				),
		),

	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		try {
			const note = interaction.options.getString('note');
			const date = interaction.options.getString('date');
			let _private = interaction.options.getBoolean('private') || false;
			if (!interaction.inGuild()) _private = true;
			const timeZone = interaction.options.getInteger('timezone') || -180;

			const originalMsg = await interaction.deferReply({
				ephemeral: _private,
				fetchReply: true,
			});

			// Creates a custom Chrono Refiner so we can set the expected utcOffset
			const custom = new chrono.Chrono();
			custom.refiners.push({
				refine: (text, results) => {
					results.forEach((r) => {
						r.start.imply('timezoneOffset', timeZone);
						r.end && r.end.imply('timezoneOffset', timeZone);
					});
					return results;
				},
			});

			// Try to parse date in english first then in pt
			const parsedDate = custom.parseDate(date, { timezone: timeZone }) || chrono.pt.parse(date, { timezone: timeZone });

			// If failed to parse
			if (!parsedDate || parsedDate.length === 0) {
				console.log(`Couldn't understand "${date}" input`);
				return await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setTitle('Reminder Error')
							.setDescription('Couldn\'t understand `date` input')
							.setColor('Red'),
					],
				});
			}
			else if (Date.now() > parsedDate.getTime()) {
				console.log(
					`Date is past. Now: ${Date.now()} | Input: ${parsedDate.getTime()}`,
				);
				return interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setTitle('Reminder Error')
							.setDescription('`date` can\'t be in the past')
							.setColor('Red'),
					],
				});
			}

			// Creates new Reminder
			let newReminder = new GuizzordeReminder({
				reminderId: Reminders.lastReminder?.reminderId + 1 || 1,
				ownerId: interaction.user?.id || interaction.member.user.id,
				message: {
					channelId: interaction.channelId,
					messageId: _private ? null : originalMsg.id,
				},
				// If invoked via DM (.user present); if on guild (.member present)
				users: [
					{
						userId: interaction.user?.id || interaction.member.user.id,
						username:
							interaction.user?.username || interaction.member.user.username,
					},
				],
				text: note,
				date: parsedDate.getTime() / 1000,
				fired: false,
				private: _private,
			});

			// Upserts to server
			newReminder = await upsertReminder(newReminder);

			// Set newly created Reminder as lastReminder - last ID created
			Reminders.lastReminder = newReminder;
			// If newly created Reminder should be fired before "current" nextReminder - set as nextReminder
			if (
				!Reminders.nextReminder?.reminderId ||
				newReminder.date < Reminders.nextReminder.date
			) {
				Reminders.nextReminder = newReminder;
				Reminders.reminderJob.setTime(
					new CronTime(
						new Date(Reminders.nextReminder.date * 1000),
						'America/Sao_Paulo',
					),
				);
				Reminders.reminderJob.start();
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle('📅 Reminder Created 📅')
						.setDescription(note)
						.setColor(0x3498db)
						.setFooter({ text: !_private ? 'Click the bell to subscribe' : null })
						.setTimestamp(parsedDate),
				],
			});

			// React on newReminder message to allow subscribers
			if (newReminder.message?.messageId && newReminder.private === false) {
				// Creates discord.js Message object from @original
				// const djsOriginalMsg = new Message(client, originalMsg, client.channels.cache.get(originalMsg.channel_id));

				await originalMsg.react('🔔');
				Reminders.idList.set(
					newReminder.message.messageId,
					newReminder.reminderId,
				);

				// Replaced with client.on(messageReactionAdd) and client.on(messageReactionRemoved)
				// This choice was made because the collector reference is lost upon bot restart
				// Whereas in the new logic we have controll of any *not fired* Reminder at maybe the cost of
				// some memory. Still could prove useful as the same system can be used for SNM VoteMessages

				// const filter = (user) => {
				//     return user.id !== djsOriginalMsg.author.id;
				// }

				// const collector = djsOriginalMsg.createReactionCollector(filter, { dispose: true });
				// collector.on('collect', (reaction, user) => {
				//     if (reaction.emoji.name !== '🔔')
				//         return reaction.remove();

				//     // Subscribe user

				//     console.log(`Subscribed ${user.username} to ${newReminder.reminderId}`);
				// });
				// collector.on('remove', (reaction, user) => {
				//     // Unsubscribe user
				//     console.log(`Unsubscribed ${user.username} from ${newReminder.reminderId}`);
				// });
				// collector.on('end', () => {
				//     djsOriginalMsg.reactions.removeAll();
				// });
			}
			console.log(
				`Reminder ${newReminder.reminderId} created for ${parsedDate.toJSON()}`,
			);
		}
		catch (e) {
			reportError(e, interaction);
		}
	},
};

export const remindMeListCommand = {
	data: new SlashCommandBuilder()
		.setName('remindme_list')
		.setDescription(
			'See your subscribed Reminders or send an existing Reminder so people can subscribe to it',
		)
		.addIntegerOption((option) =>
			option
				.setName('id')
				.setDescription('What would you like to be reminded of?'),
		),

	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		try {
			const id = interaction.options.getInteger('id');
			const requestingUserId =
				interaction.user?.id || interaction.member.user.id;

			const originalMsg = await interaction.deferReply({
				ephemeral: id ? null : true,
				fetchReply: true,
			});

			// Show all subscribed reminders
			if (!id) {
				const userSubList = await getUserSubscriptionList(requestingUserId);
				const userSubListEmbed = new EmbedBuilder()
					.setTitle('Subscribed Reminders')
					.setColor(0x3498db);
				// If array is empty - user is not subscribed to any Reminder
				if (userSubList.length === 0) {
					userSubListEmbed.setDescription('No subscribed Reminders');
				}
				else {
					// Makes Embed Description Array containing subscribed Reminders data
					const subscribedArray = [];
					for (const item of userSubList) {
						subscribedArray.push(
							`📅 ID: ${item.reminderId}\n📝 ${item.text}\n⏰ ${new Date(
								item.date * 1000,
							).toLocaleString('pt-BR', {
								timeZone: 'America/Sao_Paulo',
							})} BRT${
								item.ownerId === requestingUserId
									? `\n🙂 ${item.users.map((e) => e.username).join(', ')}`
									: ''
							}${item.private ? '\n🔒 Private' : '\n🔓 Public'}\n`,
						);
					}
					userSubListEmbed.setDescription(String(subscribedArray));
				}

				return await interaction.editReply({
					embeds: [userSubListEmbed],
				});
			}
			else {
				// Get Reminder
				let reminder = await getReminder(id);
				const oldMessageId = reminder.message.messageId;

				// If Reminder is private and requestingUser is not the owner
				if (reminder.private && requestingUserId != reminder.ownerId) {
					await interaction.deleteReply();
					await interaction.followUp({
						content:
							'This Reminder is private and only the owner can display it',
						ephemeral: true,
					});
				}
				// If Reminder is public or requestingUser ir owner - send Reminder Invitation and updates properties
				else {
					// Get new Reminder MessageId and ChannelId
					(reminder.message = {
						channelId: interaction.channelId,
						messageId: originalMsg.id,
					}),
					(reminder.private = false);
					reminder = await upsertReminder(reminder);

					(await interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setTitle('📅 Reminder Invitation 📅')
								.setDescription(reminder.text)
								.setColor(0x3498db)
								.setFooter({ text: 'Click the bell to subscribe' })
								.setTimestamp(new Date(reminder.date * 1000)),
						],
					})).react('🔔');

					Reminders.idList.delete(oldMessageId);
					Reminders.idList.set(reminder.message.messageId, reminder.reminderId);
				}
			}
		}
		catch (e) {
			reportError(e, interaction);
		}
	},
};

/**
 * Fires a Reminder to all users subscribed
 * @param {GuizzordeReminder} reminder The Reminder to be fired
 */
export async function fireReminder(reminder) {
	try {
		// Gets updated subscribed user list
		reminder.users = await getSubscribedUsers(reminder.reminderId);
		for (const user of reminder.users) {
			await client.users
				.fetch(user.userId)
				.then((u) =>
					u.send({
						embeds: [
							new EmbedBuilder()
								.setTitle('⏰ RemindMe Notification ⏰')
								.setDescription(reminder.text)
								.setColor(0x3498db)
								.setTimestamp(new Date()),
						],
					}),
				)
				.catch((e) => reportError(e));
		}

		// Upserts fired Reminder to the server
		reminder.fired = true;
		await upsertReminder(reminder);

		// Basically means if "Guild Reminder" | not "DM Reminder"
		if (reminder.message.messageId) {
			// Removes from idList, works if present or not
			Reminders.idList.delete(reminder.message.messageId);

			// See if channel and message exists
			try {
				/** @type {Message} */
				const reminderMsg = await (
					await client.channels.fetch(reminder.message.channelId)
				).messages.fetch(reminder.message.messageId);
				// Removes 🔔 from Reminder's message
				reminderMsg.reactions.cache.get('🔔').remove();

				reminderMsg.edit({
					embeds: [
						new EmbedBuilder({ ...reminderMsg.embeds[0].data }).setFooter({
							text: 'Elapsed!',
						}),
					],
				});
			}
			catch (e) {
				console.error(e);
				console.log(
					`Couldn't retrieve Reminder ${reminder.reminderId} message, maybe it was deleted?`,
				);
			}
		}

		console.log(
			`Fired Reminder with ID ${reminder.reminderId} to ${reminder.users.length} user(s)`,
		);
	}
	catch (e) {
		reminder.error = true;
		reminder.fired = true;
		await upsertReminder(reminder);
		reportError(e);
	}
}

/**
 * Sets initial Reminders memory object values
 */
export const setReminders = async () => {
	Reminders.idList = new Map(
		(await getReminderList()).map((i) => [i.messageId, i.reminderId]),
	);
	Reminders.nextReminder = await getNextReminder();
	Reminders.lastReminder = await getLastReminder();
	Reminders.reminderJob = Reminders.nextReminder
		? new CronJob(
			new Date(Reminders.nextReminder.date * 1000),
			async () => {
				try {
					await fireReminder(Reminders.nextReminder);
					Reminders.nextReminder = await getNextReminder();

					// Sets time for nextReminder and start it, if it exists
					if (Reminders.nextReminder?.reminderId) {
						Reminders.reminderJob.setTime(
							new CronTime(
								new Date(Reminders.nextReminder.date * 1000),
								'America/Sao_Paulo',
							),
						);
						Reminders.reminderJob.start();
					}
				}
				catch (e) {
					reportError(e);
				}
			},
			null,
			true,
			'America/Sao_Paulo',
		)
		: null;
};
