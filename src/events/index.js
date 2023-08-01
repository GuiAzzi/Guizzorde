import { ready } from './ready.js';
import { interactionCreate, snmVoteInteractionCreate } from './interactionCreate.js';
import { messageReactionAdd } from './messageReactionAdd.js';
import { messageReactionRemove } from './messageReactionRemove.js';
import { snmRateModalInteractionCreate } from '../commands/guild/Sunday Night Movie/snmRate.js';

export const events = [
  ready,
  interactionCreate,
  snmVoteInteractionCreate,
  messageReactionAdd,
  messageReactionRemove,
  snmRateModalInteractionCreate,
];
