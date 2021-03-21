import Discord from 'discord.js';
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

/**
 * 
 * @param {string} title Movie title
 * @param {string} jwLocale JustWatch locale
 * @returns {Promise<Discord.MessageEmbed>} The movie embed
 */
export async function generateMovieEmbed(title, jwLocale) {
    const jwEN = new JustWatch();
    const jwBR = new JustWatch({ locale: 'pt_BR' });
    // Gets movie Just Watch's ID
    // Primary locale for search is pt_BR but optionally can be en_US
    let jwSearch;
    if (jwLocale === 'en') {
        jwSearch = await jwEN.search({ query: title });
    }
    else {
        jwLocale = 'pt';
        jwSearch = await jwBR.search({ query: title });
    };

    // Filter by movies
    jwSearch.items = jwSearch.items.filter(item => item.object_type === 'movie');
    // If no movie was found
    if (jwSearch.items.length <= 0)
        return new Discord.MessageEmbed().setDescription('Movie not found 😞').setColor('RED')

    // Gets full movie detail
    const jwTitleBR = await jwBR.getTitle('movie', jwSearch.items[0].jw_entity_id.replace('tm', ''));
    // Searchs movie in english - need to get the english title for torrent finding
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
        if (jwLocale === 'en')
            jwSubtitle = await searchSubtitle(jwTorrent[0].title, 'eng').catch((e) => reportError(e));
        else
            jwSubtitle = await searchSubtitle(jwTorrent[0].title, 'pob').catch((e) => reportError(e));
        jwTorrentField = `[${jwTorrent[0].title}](${jwTorrent[0].magnet ? 'https://magnet.guiler.me?uri=' + encodeURIComponent(jwTorrent[0].magnet) : jwTorrent[0].desc})\n${jwTorrent[0].size} | ${jwTorrent[0].seeds} seeders | ${jwTorrent[0].provider} | ${jwSubtitle ? `[Subtitle](${jwLocale === 'en' ? jwSubtitle['en'].url : jwSubtitle['pb'].url})` : `No subtitle found`}` || 'No torrent found';
    }

    let embedTitleValue;
    let embedURLValue;
    let embedImageValue;

    let embedPlotValue;
    let embedGenreValue;
    let embedWhereToWatchValue;
    let embedDirectorValue;
    let embedRuntimeValue = 'Not Found';
    let embedRatingValue = {};

    if (jwLocale === 'en') {
        embedTitleValue = `${jwTitleEN.title} ${jwTitleEN.original_release_year ? `(${jwTitleEN.original_release_year})` : null}`;
        embedURLValue = `https://justwatch.com${jwTitleEN.full_path}`;
        embedImageValue = jwTitleEN.poster ? `https://images.justwatch.com${jwTitleEN.poster.replace('{profile}', 's592')}` : null;
        embedPlotValue = jwTitleEN.short_description || 'Not Found';

        // Genre
        embedGenreValue = jwTitleEN.genre_ids?.map(genreArray => {
            return jwGenresEN.find(genre => genreArray === genre.id).translation
        }).join(' | ') || 'Not Found';

        // Where to watch
        embedWhereToWatchValue = jwTitleEN.offers?.map(offer => {
            let offerRtn = jwProvidersEN.find(provider => provider.id === offer.provider_id);
            return `[${offerRtn.clear_name}](${offer.urls.standard_web})`;
        }).join(' | ') || 'Not Found';

        // Director
        embedDirectorValue = jwTitleEN.credits?.map(credit => {
            if (credit.role === 'DIRECTOR') return credit.name
        }) || 'Not Found';

        // Runtime
        if (jwTitleEN.runtime) {
            let hours = (jwTitleEN.runtime / 60);
            let rhours = Math.floor(hours);
            let minutes = (hours - rhours) * 60;
            let rminutes = Math.round(minutes);
            embedRuntimeValue = `${rhours}:${rminutes < 10 ? `0${rminutes}` : rminutes}`;
        }

        // Rating
        jwTitleEN.scoring.map(score => {
            if (score.provider_type === 'imdb:score')
                embedRatingValue.imdb = `|| ${score.value} ||`;
            else if (score.provider_type === 'tmdb:score')
                embedRatingValue.tmdb = `|| ${score.value} ||`;
            else null
        });
    }
    else {
        embedTitleValue = `${jwTitleBR.title} ${jwTitleBR.original_release_year ? `(${jwTitleBR.original_release_year})` : null}`;
        embedURLValue = `https://justwatch.com${jwTitleBR.full_path}`;
        embedImageValue = jwTitleBR.poster ? `https://images.justwatch.com${jwTitleBR.poster.replace('{profile}', 's592')}` : null;
        embedPlotValue = jwTitleBR.short_description || 'Not Found'

        // Genre
        embedGenreValue = jwTitleBR.genre_ids?.map(genreArray => {
            return jwGenresBR.find(genre => genreArray === genre.id).translation
        }).join(' | ') || 'Not Found';

        // Where to watch
        embedWhereToWatchValue = jwTitleBR.offers?.map(offer => {
            let offerRtn = jwProvidersBR.find(provider => provider.id === offer.provider_id);
            return `[${offerRtn.clear_name}](${offer.urls.standard_web})`;
        }).join(' | ') || 'Not Found';

        // Director
        embedDirectorValue = jwTitleBR.credits?.map(credit => {
            if (credit.role === 'DIRECTOR') return credit.name
        }) || 'Not Found';

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
                value: embedPlotValue
            },
            {
                // Genres
                name: 'Genre',
                value: embedGenreValue
            },
            {
                name: 'Directed by',
                value: embedDirectorValue,
                inline: true
            },
            {
                name: 'Runtime',
                value: embedRuntimeValue,
                inline: true
            },
            {
                name: 'Where to watch',
                value: embedWhereToWatchValue
            },
            {
                name: 'IMDB',
                value: embedRatingValue.imdb || 'Not Found',
                inline: true
            },
            {
                name: 'TMDB',
                value: embedRatingValue.tmdb || 'Not Found',
                inline: true
            },
            {
                name: 'Torrent',
                value: jwTorrentField
            },
        )
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
    handler: async function (interaction) {
        try {
            // FIXME: Messy AF - Maybe let default be EN
            const title = interaction.data.options?.find((arg => arg.name === 'title'))?.value;
            let jwLocale = interaction.data.options?.find((arg => arg.name === 'language'))?.value;

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