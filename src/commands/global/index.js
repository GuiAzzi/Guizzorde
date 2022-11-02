import { pingCommand } from './ping/ping.js';
import { sayCommand } from './say/say.js';
import { memeCommand } from './meme/meme.js';
import { torrentCommand } from './torrent/torrent.js';
import { ratoCommand } from './rato/rato.js';
import { emojiCommand } from './emoji/emoji.js';
import { tomaCommand } from './toma/toma.js';
import { donatoCommand } from './donato/donato.js';
import { randomCommand } from './random/random.js';
import { pollCommand } from './poll/poll.js';
import { movieCommand } from './movie/movie.js';
import { subtitleCommand } from './subtitle/subtitle.js';
import { queridometroCommand } from './queridometro/queridometro.js';
import { remindMeCommand, remindMeListCommand } from './remindMe/remindMe.js';

export const globalCommands = [
	pingCommand,
	sayCommand,
	memeCommand,
	torrentCommand,
	ratoCommand,
	emojiCommand,
	tomaCommand,
	donatoCommand,
	randomCommand,
	pollCommand,
	movieCommand,
	subtitleCommand,
	queridometroCommand,
	remindMeCommand,
	remindMeListCommand,
];
