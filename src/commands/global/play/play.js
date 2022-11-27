import { createRequire } from 'module';
import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	PermissionFlagsBits,
} from 'discord.js';
import {
	entersState,
	VoiceConnectionStatus,
	createAudioPlayer,
	createAudioResource,
	StreamType,
	AudioPlayer,
	VoiceConnection,
	AudioPlayerStatus,
	AudioResource,
} from '@discordjs/voice';
const { joinVoiceChannel } = createRequire(import.meta.url)('@discordjs/voice');
import ytdl from 'ytdl-core';

import { configObj } from '../../../config/index.js';
import { reportError } from '../../../util/index.js';

/** @type {{player: AudioPlayer, connection: VoiceConnection}} */
export const player_connection = {
	player: createAudioPlayer(),
	connection: null,
};

export const playCommand = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Plays audio from a YouTube video')
		.addStringOption((option) =>
			option.setName('url').setDescription('A YouTube link').setRequired(true),
		)
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	handler: async function(interaction) {
		try {
			await interaction.deferReply({ ephemeral: true });
			if (
				interaction.user.id !== configObj.ownerId &&
				interaction.user.id !== '524072816560177154'
			) {
				console.log('not owner');
				return interaction.editReply({
					content: 'Not yet available',
					ephemeral: true,
				});
			}
			if (!interaction.member.voice?.channel) {
				console.log('not connected to a channel');
				return interaction.editReply({
					content: 'You must be connected to a channel',
					ephemeral: true,
				});
			}

			const url = interaction.options.getString('url');

			player_connection.connection = joinVoiceChannel({
				channelId: interaction.member.voice.channel.id,
				guildId: interaction.guildId,
				adapterCreator: interaction.guild.voiceAdapterCreator,
			});

			// Make sure the connection is ready before processing the user's request
			try {
				await entersState(
					player_connection.connection,
					VoiceConnectionStatus.Ready,
					20e3,
				);
			}
			catch (e) {
				console.log('Voice Connection wasn\'t ready in time');
				return reportError(e, interaction);
			}

			player_connection.connection.subscribe(player_connection.player);
			/** @type {AudioResource}  */
			let resource;
			const volume = 0.5;

			if (url === 'countdown') {
				resource = createAudioResource(
					`src/commands/guild/Sunday Night Movie/sounds/countdown${
						Math.floor(Math.random() * 6) + 1
					}.mp3`,
					{ inputType: StreamType.Arbitrary, inlineVolume: true },
				);
			}
			else if (url === 'countdown1') {
				resource = createAudioResource(
					'src/commands/guild/Sunday Night Movie/sounds/countdown1.mp3',
					{ inputType: StreamType.Arbitrary, inlineVolume: true },
				);
			}
			else if (url === 'countdown2') {
				resource = createAudioResource(
					'src/commands/guild/Sunday Night Movie/sounds/countdown2.mp3',
					{ inputType: StreamType.Arbitrary, inlineVolume: true },
				);
			}
			else if (url === 'countdown3') {
				resource = createAudioResource(
					'src/commands/guild/Sunday Night Movie/sounds/countdown3.mp3',
					{ inputType: StreamType.Arbitrary, inlineVolume: true },
				);
			}
			else if (url === 'countdown4') {
				resource = createAudioResource(
					'src/commands/guild/Sunday Night Movie/sounds/countdown4.mp3',
					{ inputType: StreamType.Arbitrary, inlineVolume: true },
				);
			}
			else if (url === 'countdown5') {
				resource = createAudioResource(
					'src/commands/guild/Sunday Night Movie/sounds/countdown5.mp3',
					{ inputType: StreamType.Arbitrary, inlineVolume: true },
				);
			}
			else if (url === 'countdown6') {
				resource = createAudioResource(
					'src/commands/guild/Sunday Night Movie/sounds/countdown6.mp3',
					{ inputType: StreamType.Arbitrary, inlineVolume: true },
				);
			}
			else {
				resource = createAudioResource(ytdl(url, { filter: 'audioonly' }), {
					inputType: StreamType.Arbitrary,
					inlineVolume: true,
				});
			}

			resource.volume.setVolume(volume);
			player_connection.player.play(resource);
			interaction.editReply('Playing audio...');

			player_connection.player.on(AudioPlayerStatus.Idle, () => {
				console.log('finished playing audio');
				interaction.editReply('Audio finished playing.');
				player_connection.player.stop();
				player_connection.connection.disconnect();
			});
		}
		catch (e) {
			player_connection.player?.stop();
			player_connection.connection?.disconnect();
			throw e;
		}
	},
};
