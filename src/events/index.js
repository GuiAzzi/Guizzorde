import { ready } from './ready.js';
import { interactionCreate, snmVoteInteractionCreate } from './interactionCreate.js';
import { messageReactionAdd } from './messageReactionAdd.js';
import { messageReactionRemove } from './messageReactionRemove.js';

export const events = [
	ready,
	interactionCreate,
	snmVoteInteractionCreate,
	messageReactionAdd,
	messageReactionRemove,
];
