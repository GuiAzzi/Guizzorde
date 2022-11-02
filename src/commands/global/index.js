import { pingCommand } from './ping/ping.js';
import { sayCommand } from './say/say.js';
import { memeCommand } from './meme/meme.js';
import { torrentCommand } from './torrent/torrent.js';
import { ratoCommand } from './rato/rato.js';
import { emojiCommand } from './emoji/emoji.js';
import { tomaCommand } from './toma/toma.js';
import { donatoCommand } from './donato/donato.js';

export const globalCommands = [
	pingCommand,
	sayCommand,
	memeCommand,
	torrentCommand,
	ratoCommand,
	emojiCommand,
	tomaCommand,
	donatoCommand,
];
