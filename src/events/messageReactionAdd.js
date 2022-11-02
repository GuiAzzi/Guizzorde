import DiscordTypes, { Events } from 'discord.js';
import { Reminders, toggleUserSubscription } from '../commands/global/remindMe/index.js';
import { client } from '../config/index.js';

export const messageReactionAdd = {
	name: Events.MessageReactionAdd,
	once: false,
	/**
	 * @param {DiscordTypes.MessageReaction | DiscordTypes.PartialMessageReaction} reaction
	 * @param {DiscordTypes.User | DiscordTypes.PartialUser} user
	 */
	async handler(reaction, user) {
		// Reactions from self, do nothing
		if (user.id === client.user.id) {
			return;
		}
		else if (reaction.partial) {
			console.log(
				`Reaction on partial message. Fetching channel "${reaction.message.channelId}" and message "${reaction.message.id}"`,
			);
			await reaction.fetch();
		}

		// Reaction on queridometro
		if (
			reaction.message.embeds &&
			reaction.message.embeds[0]?.title === 'Queridometro'
		) {
			console.log(`${user.username} reacted on queridometro`);
			// checks if user has a reaction on any other emoji
			reaction.message.reactions.cache.forEach(async (r) => {
				// if a previous reaction is found, remove it
				if (
					r !== reaction &&
					r.users.cache.find((userIndex) => userIndex.id === user.id)
				) {
					try {
						await r.users.remove(user);
						console.log(
							`Removed ${user.username}'s previous reaction from queridometro`,
						);
					}
					catch (e) {
						console.log(
							`Could not remove ${user.username}'s reaction from queridometro`,
						);
					}
				}
			});
		}
		// Reaction on a *not fired* Reminder inside Reminders.idList
		else if (Reminders.idList.has(reaction.message.id)) {
			if (reaction.emoji.name === '🔔') {
				// Subscribe User
				toggleUserSubscription(Reminders.idList.get(reaction.message.id), user, 'add');
			}
		}
	},
};
