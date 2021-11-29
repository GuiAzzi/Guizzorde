import Discord, { CommandInteraction } from 'discord.js';
import JustWatch from 'justwatch-api';
import OS from 'opensubtitles-api';
import torrentSearch from 'torrent-search-api';

import {
    client,
    configObj,
} from '../../config/index.js';
import { reportError } from '../../util/index.js';
import {
    deregister,
    GuizzordeCommand,
    register,
} from '../index.js';
import {
    jwGenresBR,
    jwGenresEN,
    jwProvidersBR,
    jwProvidersEN,
} from './jw/jw.js';

// FIXME: Put on slashSubtitle when it exists
// OpenSub Auth
const OpenSubtitles = new OS({
    useragent: configObj.OSCredentials[0],
    username: configObj.OSCredentials[1],
    password: configObj.OSCredentials[2],
    ssl: true
});
const searchSubtitle = async (title, lang = 'eng') => {
    try {
        const sub = await OpenSubtitles.search({
            sublanguageid: lang,
            query: title
        });

        if (Object.keys(sub).length !== 0) return sub;
        else return false;
    }
    catch (e) {
        reportError(e);
        return false;
    }
}

// FIXME: Merge these two methods, maybe?
/**
 * Generates full movie embed with torrent and subtitle
 * @param {string} title Movie title
 * @param {string} [jwLocale] JustWatch locale
 * @returns {Promise<Discord.MessageEmbed>} The movie embed
 */
export async function generateMovieEmbed(title, jwLocale) {
    const jwEN = new JustWatch();
    const jwBR = new JustWatch({ locale: 'pt_BR' });
    // Gets movie Just Watch's ID
    // Primary locale for search is pt_BR but optionally can be en_US
    let jwSearch;
    if (jwLocale === 'pt') {
        jwSearch = await jwBR.search({ query: title });
    }
    else {
        // jwLocale = 'en';
        jwSearch = await jwEN.search({ query: title });
    };

    // Filter by movies
    jwSearch.items = jwSearch.items.filter(item => item.object_type === 'movie');
    // If no movie was found
    if (jwSearch.items.length <= 0)
        return new Discord.MessageEmbed().setDescription('Movie not found 😞').setColor('RED')

    // Right now, using all data from english database, except if Portuguese was forced in the command and for
    // "Streaming on" section on SNM's

    // Gets full movie detail in Portuguese (for Streaming on)
    const jwTitleBR = await jwBR.getTitle('movie', jwSearch.items[0].jw_entity_id.replace('tm', ''));
    // Gets movie in english for everything else
    const jwTitleEN = await jwEN.getTitle('movie', jwSearch.items[0].jw_entity_id.replace('tm', ''));

    // Creates provider list so I can ignore duplicate versions (sd, hd, 4k - doesn't matter for this use case)
    const providerIdsBR = [];
    const providerIdsEN = [];
    // Removes duplicates
    jwTitleBR.offers ? jwTitleBR.offers = jwTitleBR.offers.filter(offer => {
        if (offer.monetization_type === 'flatrate' && providerIdsBR.indexOf(offer.provider_id) < 0) {
            providerIdsBR.push(offer.provider_id)
            return offer;
        }
    }) : null;
    jwTitleEN.offers ? jwTitleEN.offers = jwTitleEN.offers.filter(offer => {
        if (offer.monetization_type === 'flatrate' && providerIdsEN.indexOf(offer.provider_id) < 0) {
            providerIdsEN.push(offer.provider_id)
            return offer;
        }
    }) : null;
    // We just need IMDB and TMDB score
    jwTitleBR.scoring = jwTitleBR.scoring?.filter(score => score.provider_type === 'imdb:score' || score.provider_type === 'tmdb:score');

    // Searchs torrent and subtitle
    let jwTorrentField = 'No torrent found';
    let jwSubtitle;
    let jwTorrent = await torrentSearch.search(['Rarbg'], `${jwTitleEN.title} ${jwTitleEN.original_release_year || null} 1080p`, 'Movies', 1).catch((e) => reportError(e));

    // If Rarbg breaks, try again
    if (jwTorrent.length === 0 || !jwTorrent) {
        // Little hack to force second execution - without this the code was being skipped - something to do with async stuff
        await new Promise(resolve => setTimeout(resolve, 0));
        // Searches in other trackers
        jwTorrent = await torrentSearch.search(['Rarbg', 'ThePirateBay', '1337x'], `${jwTitleEN.title} ${jwTitleEN.original_release_year || null} 1080p`, 'Movies', 1).catch((e) => reportError(e));
    }

    if (jwTorrent && jwTorrent.length !== 0 && jwTorrent[0].title !== "No results returned") {
        if (jwLocale === 'pt')
            jwSubtitle = await searchSubtitle(jwTorrent[0].title, 'pob').catch((e) => reportError(e));
        else
            jwSubtitle = await searchSubtitle(jwTorrent[0].title, 'eng').catch((e) => reportError(e));
        jwTorrentField = `[${jwTorrent[0].title}](${jwTorrent[0].magnet ? 'https://magnet.guiler.me?uri=' + encodeURIComponent(jwTorrent[0].magnet) : jwTorrent[0].desc})\n${jwTorrent[0].size} | ${jwTorrent[0].seeds} seeders | ${jwTorrent[0].provider} | ${jwSubtitle ? `[Subtitle](${jwLocale === 'pt' ? jwSubtitle['pb'].url : jwSubtitle['en'].url})` : `No subtitle found`}` || 'No torrent found';
    }

    // Title
    let embedTitleValue = `${jwTitleEN.title} ${jwTitleEN.original_release_year ? `(${jwTitleEN.original_release_year})` : null}`;

    // URL / JustWatch Path
    let embedURLValue = `https://justwatch.com${jwTitleEN.full_path}`;

    // Poster/Cover
    let embedImageValue = jwTitleEN.poster ? `https://images.justwatch.com${jwTitleEN.poster.replace('{profile}', 's592')}` : null;

    // Plot/Summary
    let embedPlotValue = jwTitleEN.short_description || 'Not Found';

    // Genre
    let embedGenreValue = jwTitleEN.genre_ids?.map(genreArray => {
        return jwGenresEN.find(genre => genreArray === genre.id).translation
    }).join(' | ') || 'Not Found';

    // Streaming on (BR)
    let embedStreamingOn = jwTitleBR.offers?.map(offer => {
        let offerRtn = jwProvidersBR.find(provider => provider.id === offer.provider_id);
        return `[${offerRtn?.clear_name || offerRtn?.technical_name}](${offer.urls.standard_web})`;
    }).join(' | ') || 'Not Found';

    // Director
    let embedDirectorValue = jwTitleEN.credits?.reduce((directors = [], credit) => {
        if (credit.role === 'DIRECTOR') directors.push(credit.name);
        return directors;
    }, []).join(', ') || 'Not Found';

    // Cast
    let embedCastValue = jwTitleEN.credits?.reduce((actors = [], credit) => {
        if (credit.role === 'ACTOR') actors.push(credit.name);
        return actors;
    }, []).slice(0, 4).join(', ') || 'Not Found';

    // Runtime
    let embedRuntimeValue = 'Not Found';
    if (jwTitleEN.runtime) {
        let hours = (jwTitleEN.runtime / 60);
        let rhours = Math.floor(hours);
        let minutes = (hours - rhours) * 60;
        let rminutes = Math.round(minutes);
        embedRuntimeValue = `${rhours}:${rminutes < 10 ? `0${rminutes}` : rminutes}`;
    }

    // Rating
    let embedRatingValue = {}
    jwTitleEN.scoring.map(score => {
        if (score.provider_type === 'imdb:score')
            embedRatingValue.imdb = `|| ${score.value} ||`;
        else if (score.provider_type === 'tmdb:score')
            embedRatingValue.tmdb = `|| ${score.value} ||`;
        else null
    });

    if (jwLocale === 'en') {
        // Streaming on (US)
        embedStreamingOn = jwTitleEN.offers?.map(offer => {
            let offerRtn = jwProvidersEN.find(provider => provider.id === offer.provider_id);
            return `[${offerRtn?.clear_name || offerRtn?.technical_name}](${offer.urls.standard_web})`;
        }).join(' | ') || 'Not Found';
    }
    else if (jwLocale === 'pt') {
        embedTitleValue = `${jwTitleBR.title} ${jwTitleBR.original_release_year ? `(${jwTitleBR.original_release_year})` : null}`;
        embedURLValue = `https://justwatch.com${jwTitleBR.full_path}`;
        embedImageValue = jwTitleBR.poster ? `https://images.justwatch.com${jwTitleBR.poster.replace('{profile}', 's592')}` : null;
        embedPlotValue = jwTitleBR.short_description || 'Not Found'

        // Genre
        embedGenreValue = jwTitleBR.genre_ids?.map(genreArray => {
            return jwGenresBR.find(genre => genreArray === genre.id).translation
        }).join(' | ') || 'Not Found';

        // Streaming on
        embedStreamingOn = jwTitleBR.offers?.map(offer => {
            let offerRtn = jwProvidersBR.find(provider => provider.id === offer.provider_id);
            return `[${offerRtn?.clear_name || offerRtn?.technical_name}](${offer.urls.standard_web})`;
        }).join(' | ') || 'Not Found';

        // Director
        embedDirectorValue = jwTitleBR.credits?.reduce((directors = [], credit) => {
            if (credit.role === 'DIRECTOR') directors.push(credit.name);
            return directors;
        }, []).join(', ') || 'Not Found';

        // Runtime
        if (jwTitleBR.runtime) {
            let hours = (jwTitleBR.runtime / 60);
            let rhours = Math.floor(hours);
            let minutes = (hours - rhours) * 60;
            let rminutes = Math.round(minutes);
            embedRuntimeValue = `${rhours}:${rminutes < 10 ? `0${rminutes}` : rminutes}`;
        }

        // Rating
        jwTitleBR.scoring.map(score => {
            if (score.provider_type === 'imdb:score')
                embedRatingValue.imdb = `|| ${score.value} ||`;
            else if (score.provider_type === 'tmdb:score')
                embedRatingValue.tmdb = `|| ${score.value} ||`;
            else null
        });
    }

    // Send Embed
    return new Discord.MessageEmbed()
        // Original title + (release year) - The Lodge (2020)
        .setTitle(embedTitleValue)
        // JustWatch URL
        .setURL(embedURLValue)
        .setColor(0x3498DB)
        // Movie poster
        .setImage(embedImageValue)
        .addFields(
            {
                // Synopse
                name: 'Plot',
                value: String(embedPlotValue)
            },
            {
                // Genres
                name: 'Genre',
                value: String(embedGenreValue)
            },
            {
                name: 'Directed by',
                value: String(embedDirectorValue),
                inline: true
            },
            {
                name: 'Runtime',
                value: String(embedRuntimeValue),
                inline: true
            },
            {
                name: 'Cast',
                value: String(embedCastValue),
            },
            {
                name: 'Streaming on',
                value: String(embedStreamingOn)
            },
            {
                name: 'IMDB',
                value: String(embedRatingValue.imdb || 'Not Found'),
                inline: true
            },
            {
                name: 'TMDB',
                value: String(embedRatingValue.tmdb || 'Not Found'),
                inline: true
            },
            {
                name: 'Torrent',
                value: String(jwTorrentField)
            },
        )
}

/**
 * Generates compact movie embed
 * @param {string} title Movie title
 * @param {string} [jwLocale] JustWatch locale
 * @returns {Promise<Discord.MessageEmbed>} The movie embed
 */
export async function generateCompactMovieEmbed(title, jwLocale) {
    // const jw = new JustWatch({ locale: jwLocale });
    const jw = new JustWatch();

    const jwSearch = await jw.search({ query: title });

    // Filter by movies
    jwSearch.items = jwSearch.items.filter(item => item.object_type === 'movie');
    if (jwSearch.items.length <= 0)
        return null;

    const jwTitle = await jw.getTitle('movie', jwSearch.items[0].jw_entity_id.replace('tm', ''));
    jwTitle.scoring = jwTitle.scoring?.filter(score => score.provider_type === 'imdb:score' || score.provider_type === 'tmdb:score');

    const embedTitleValue = `${jwTitle.title} ${jwTitle.original_release_year ? `(${jwTitle.original_release_year})` : null}`;
    const embedURLValue = `https://justwatch.com${jwTitle.full_path}`;
    const embedImageValue = jwTitle.poster ? `https://images.justwatch.com${jwTitle.poster.replace('{profile}', 's592')}` : null;
    const embedPlotValue = jwTitle.short_description || 'Not Found';
    const embedGenreValue = jwTitle.genre_ids?.map(genreArray => {
        return jwGenresEN.find(genre => genreArray === genre.id).translation
    }).join(' | ') || 'Not Found';
    const embedDirectorValue = jwTitle.credits?.reduce((directors = [], credit) => {
        if (credit.role === 'DIRECTOR') directors.push(credit.name);
        return directors;
    }, []).join(', ') || 'Not Found';
    const embedCastValue = jwTitle.credits?.reduce((actors = [], credit) => {
        if (credit.role === 'ACTOR') actors.push(credit.name);
        return actors;
    }, []).slice(0, 4).join(', ') || 'Not Found';
    let embedRuntimeValue = 'Not Found';
    if (jwTitle.runtime) {
        let hours = (jwTitle.runtime / 60);
        let rhours = Math.floor(hours);
        let minutes = (hours - rhours) * 60;
        let rminutes = Math.round(minutes);
        embedRuntimeValue = `${rhours}:${rminutes < 10 ? `0${rminutes}` : rminutes}`;
    }
    let embedRatingValue = {};
    jwTitle.scoring.map(score => {
        if (score.provider_type === 'imdb:score')
            embedRatingValue.imdb = `|| ${score.value} ||`;
        else if (score.provider_type === 'tmdb:score')
            embedRatingValue.tmdb = `|| ${score.value} ||`;
        else null
    });
    return new Discord.MessageEmbed()
        .setTitle(embedTitleValue)
        .setURL(embedURLValue)
        .setColor(0x3498DB)
        .setThumbnail(embedImageValue)
        .addFields(
            {
                name: 'Plot',
                value: String(embedPlotValue)
            },
            {
                name: 'Directed by',
                value: String(embedDirectorValue),
                inline: true
            },
            {
                name: 'Runtime',
                value: String(embedRuntimeValue),
                inline: true
            },
            {
                name: 'Cast',
                value: String(embedCastValue),
            },
            {
                name: 'Genre',
                value: String(embedGenreValue)
            },
            {
                name: 'IMDB',
                value: String(embedRatingValue.imdb || 'Not Found'),
                inline: true
            },
            {
                name: 'TMDB',
                value: String(embedRatingValue.tmdb || 'Not Found'),
                inline: true
            },
        )
        .setTimestamp(new Date().toJSON());
}

export const slashMovie = new GuizzordeCommand({
    command: {
        name: 'movie',
        description: `Show info about a movie`,
        options: [
            {
                type: 3,
                name: 'title',
                required: true,
                description: `What's the name of the movie?`
            },
            {
                type: 3,
                name: 'language',
                description: 'Specify the database search language',
                choices: [
                    {
                        name: 'English',
                        value: 'en'
                    },
                    {
                        name: 'Portuguese',
                        value: 'pt'
                    }
                ]
            }
        ]
    },
    register: register,
    deregister: deregister,
    /** @param {CommandInteraction} interaction */
    handler: async function (interaction) {
        try {
            // FIXME: Messy AF - Maybe let default be EN
            const title = interaction.options.getString('title');
            let jwLocale = interaction.options.getString('language');

            // Sends to-be-edited message
            await client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        embeds: [new Discord.MessageEmbed().setTitle('Searching...').setColor(0x3498DB)]
                    }
                }
            });

            return await client.api.webhooks(configObj.appId, interaction.token).messages('@original').patch({
                data: {
                    embeds: [await generateMovieEmbed(title, jwLocale)]
                }
            });
        }
        catch (e) {
            reportError(e);
        }
    }
});