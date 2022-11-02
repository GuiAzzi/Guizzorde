import DiscordTypes, { Events } from 'discord.js';
import {
	Reminders,
	toggleUserSubscription,
} from '../commands/global/remindMe/index.js';
import { client } from '../config/index.js';

export const messageReactionRemove = {
	name: Events.MessageReactionRemove,
	once: false,
	/**
	 * @param {DiscordTypes.MessageReaction | DiscordTypes.PartialMessageReaction} reaction
	 * @param {DiscordTypes.User | DiscordTypes.PartialUser} user
	 */
	async handler(reaction, user) {
		// Reactions from self, do nothing
		if (user.id === client.user.id) {return;}
		// Reaction on a *not fired* Reminder inside Reminders.idList
		else if (Reminders.idList.has(reaction.message.id)) {
			if (reaction.emoji.name === '🔔') {
				// Unsubscribe User
				toggleUserSubscription(
					Reminders.idList.get(reaction.message.id),
					user,
					'remove',
				);
			}
		}
	},
};
