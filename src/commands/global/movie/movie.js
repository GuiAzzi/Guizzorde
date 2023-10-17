import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import torrentSearch from 'torrent-search-api';
import { searchSubtitle } from '../subtitle/subtitle.js';
import { reportError } from '../../../util/index.js';
import {
  tmdbMovieDetailsAndCredits,
  tmdbSearchMovie,
  tmdbWatchProviders,
} from './tmdb/tmdbClient.js';

/**
 * Generates full movie embed with torrent and subtitle
 * @param {string} title Movie title
 * @param {string} [locale] String locale //Ex: 'en_US' or 'pt_BR'
 * @param {string} [tmdbId] The TMDB ID to fetch, if known //Ex: tmdb505
 * @param {boolean} [compact] Generate a compact embed
 * @returns {Promise<EmbedBuilder>} The movie embed
 */
export async function generateMovieEmbed(title, locale, tmdbId, compact) {
  // Check if movie ID is at the beggining of the title (from autocomplete)
  const idMatch = title.match(/(^tmdb\d+ - )(.+)/);
  if (idMatch) {
    tmdbId = idMatch[1].split(' - ')[0].replace('tmdb', '');
    title = idMatch[2];
  }

  // Gets movie TMDB's ID if we don't already have it

  if (!tmdbId) {
    tmdbId = (await tmdbSearchMovie(title, locale))[0]?.id;

    // If no movie was found
    if (!tmdbId) {
      return new EmbedBuilder()
        .setDescription('No movies found 😞')
        .setColor('Red');
    }
  }
  else {
    tmdbId = tmdbId.replace('tmdb', '');
  }

  const tmdbMovieDetailsAndCreditsResult = await tmdbMovieDetailsAndCredits(
    tmdbId,
    locale,
  );

  const movieReleaseYear =
    tmdbMovieDetailsAndCreditsResult?.release_date.split('-')[0] || null;

  // Title
  const embedTitleValue = `${tmdbMovieDetailsAndCreditsResult.title} ${
    movieReleaseYear ? `(${movieReleaseYear})` : null
  }`;

  // URL / TMDB Path
  const embedURLValue = `https://www.themoviedb.org/movie/${tmdbMovieDetailsAndCreditsResult.id}`;

  // Poster/Cover
  const embedImageValue = tmdbMovieDetailsAndCreditsResult.poster_path
    ? `https://image.tmdb.org/t/p/w500/${tmdbMovieDetailsAndCreditsResult.poster_path}`
    : null;

  // Plot/Summary
  const embedPlotValue =
    tmdbMovieDetailsAndCreditsResult.overview || 'Not Found';

  // Genre
  const embedGenreValue =
    tmdbMovieDetailsAndCreditsResult.genres?.reduce(
      (acc, currGenre, currIndex) =>
        acc +
        `${currGenre.name}${
          currIndex + 1 !== tmdbMovieDetailsAndCreditsResult.genres.length
            ? ' | '
            : ''
        }`,
      '',
    ) || 'Not Found';

  // Director
  const embedDirectorValue = tmdbMovieDetailsAndCreditsResult.credits.crew
    .filter((crew) => crew.job === 'Director')
    .reduce(
      (acc, currDirector, currIndex, filteredArr) =>
        acc +
        `${currDirector.name}${
          currIndex + 1 !== filteredArr.length ? ' | ' : ''
        }`,
      '',
    );

  // Cast
  const embedCastValue = tmdbMovieDetailsAndCreditsResult.credits.cast
    .slice(0, 4)
    .reduce(
      (acc, currActor, currIndex, slicedArr) =>
        acc +
        `${currActor.name}${currIndex + 1 !== slicedArr.length ? ', ' : ''}`,
      '',
    );

  // Runtime
  let embedRuntimeValue = 'Not Found';
  if (tmdbMovieDetailsAndCreditsResult.runtime) {
    const hours = tmdbMovieDetailsAndCreditsResult.runtime / 60;
    const rhours = Math.floor(hours);
    const minutes = (hours - rhours) * 60;
    const rminutes = Math.round(minutes);
    embedRuntimeValue = `${rhours}:${
      rminutes < 10 ? `0${rminutes}` : rminutes
    }`;
  }

  // Rating
  const embedRatingValue = {};
  embedRatingValue.tmdb = `|| ${
    Math.floor(tmdbMovieDetailsAndCreditsResult.vote_average * 10) / 10
  } ||`;

  if (compact) {
    // Send Compact Embed
    return (
      new EmbedBuilder()
        // Original title + (release year) //Ex: The Lodge (2020)
        .setTitle(embedTitleValue)
        // Tagline
        .setDescription(tmdbMovieDetailsAndCreditsResult?.tagline || null)
        // TMDB URL
        .setURL(embedURLValue)
        .setColor(0x3498db)
        // Movie poster
        .setThumbnail(embedImageValue)
        .setTimestamp(new Date())
        .addFields(
          {
            // Synopse
            name: 'Plot',
            value: String(embedPlotValue),
          },
          {
            name: 'Directed by',
            value: String(embedDirectorValue),
            inline: true,
          },
          {
            name: 'Runtime',
            value: String(embedRuntimeValue),
            inline: true,
          },
          {
            name: 'Cast',
            value: String(embedCastValue),
          },
          {
            // Genres
            name: 'Genre',
            value: String(embedGenreValue),
            inline: true,
          },
          // {
          //   name: 'IMDB',
          //   value: String(embedRatingValue.imdb || 'Not Found'),
          //   inline: true,
          // },
          {
            name: 'TMDB',
            value: String(embedRatingValue.tmdb || 'Not Found'),
            inline: true,
          },
        )
    );
  }
  else {
    // Always get pt_BR "where to watch"
    // TODO: Use discord server region
    const tmdbWatchProvidersResult = await tmdbWatchProviders(tmdbId, 'pt_BR');

    // Streaming on
    const embedStreamingOn = tmdbWatchProvidersResult?.flatrate
      ? `[${tmdbWatchProvidersResult?.flatrate.reduce(
        (acc, currProvider, currIndex) =>
          acc +
            `${currProvider.provider_name}${
              currIndex + 1 !== tmdbWatchProvidersResult.flatrate.length
                ? ' | '
                : ''
            }`,
        '',
      )}](${tmdbWatchProvidersResult?.link})`
      : 'Not Found';

    // Searchs torrent and subtitle
    let movieTorrentField = 'No torrent found';
    let movieSubtitle;
    let movieTorrent;

    try {
      movieTorrent = await torrentSearch
        .search(
          ['1337x'],
          `${tmdbMovieDetailsAndCreditsResult.title} ${movieReleaseYear} 1080p`,
          'Movies',
          1,
        )
        .catch();

      // If it fails, try again
      if (movieTorrent?.length === 0 || !movieTorrent) {
        // Little hack to force second execution - without this the code was being skipped - something to do with async stuff
        await new Promise((resolve) => setTimeout(resolve, 0));
        // Searches in other trackers
        movieTorrent = await torrentSearch
          .search(
            ['1337x', 'yts'],
            `${tmdbMovieDetailsAndCreditsResult.title} ${movieReleaseYear} 1080p`,
            'Movies',
            1,
          )
          .catch(() => {
            return [];
          });
      }
    }
    catch (e) {
      reportError(e);
      movieTorrent = [];
    }

    if (
      movieTorrent &&
      movieTorrent.length !== 0 &&
      movieTorrent[0].title !== 'No results returned'
    ) {
      movieSubtitle = await searchSubtitle(
        movieTorrent[0].title,
        locale === 'pt_BR' ? 'pt-br' : 'en',
      ).catch((e) => reportError(e));
      movieTorrentField =
        `[${movieTorrent[0].title}](${
          movieTorrent[0].magnet
            ? 'https://magnet.guiler.me?uri=' +
              encodeURIComponent(movieTorrent[0].magnet)
            : movieTorrent[0].desc
        })\n${movieTorrent[0].size} | ${movieTorrent[0].seeds} seeders | ${
          movieTorrent[0].provider
        } | ${
          movieSubtitle
            ? `[Subtitle](${movieSubtitle.link})`
            : 'No subtitle found'
        }` || 'No torrent found';
    }

    // Send Full Embed
    return (
      new EmbedBuilder()
        // Original title + (release year) //Ex: The Lodge (2020)
        .setTitle(embedTitleValue)
        // Tagline
        .setDescription(tmdbMovieDetailsAndCreditsResult?.tagline || null)
        // TMDB URL
        .setURL(embedURLValue)
        .setColor(0x3498db)
        // Movie poster
        .setImage(embedImageValue)
        .addFields(
          {
            // Synopse
            name: 'Plot',
            value: String(embedPlotValue),
          },
          {
            // Genres
            name: 'Genre',
            value: String(embedGenreValue),
          },
          {
            name: 'Directed by',
            value: String(embedDirectorValue),
            inline: true,
          },
          {
            name: 'Runtime',
            value: String(embedRuntimeValue),
            inline: true,
          },
          {
            name: 'Cast',
            value: String(embedCastValue),
          },
          {
            name: 'Streaming on',
            value: String(embedStreamingOn),
            inline: true,
          },
          // {
          //   name: 'IMDB',
          //   value: String(embedRatingValue.imdb || 'Not Found'),
          //   inline: true,
          // },
          {
            name: 'TMDB',
            value: String(embedRatingValue.tmdb || 'Not Found'),
            inline: true,
          },
          {
            name: 'Torrent',
            value: String(movieTorrentField),
          },
        )
    );
  }
}

/**
 * Searches query on TMDB and returns first n results (5 by default)
 * @param {string} titleName Movie title to search
 * @param {number} maxResults Number of results to return
 * @returns {Promise<[import('./tmdb/tmdbTypes.js').TMDBSearchMovie]>}
 */
export async function searchTitles(titleName, maxResults = 5) {
  try {
    const tmdbSearchResult = await tmdbSearchMovie(titleName);

    return tmdbSearchResult?.slice(0, maxResults);
  }
  catch (e) {
    reportError(e);
  }
}

export const movieCommand = {
  data: new SlashCommandBuilder()
    .setName('movie')
    .setDescription('Gather info about a movie, including where to watch.')
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('What\'s the name of the movie?')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName('language')
        .setDescription('Specify the database search language')
        .addChoices(
          { name: 'English', value: 'en_US' },
          { name: 'Brazilian Portuguese', value: 'pt_BR' },
        ),
    ),
  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  handler: async function(interaction) {
    try {
      const title = interaction.options.getString('title');
      const locale = interaction.options.getString('language');

      // Sends to-be-edited message
      await interaction.deferReply();

      await interaction.editReply({
        embeds: [await generateMovieEmbed(title, locale)],
      });
    }
    catch (e) {
      reportError(e, interaction);
    }
  },
  autocomplete: async function(interaction) {
    try {
      const focusedValue = interaction.options.getFocused();
      if (!focusedValue) return await interaction.respond(null);
      const titlesFound = await searchTitles(focusedValue);
      if (!titlesFound) {
        return null;
      }
      return await interaction.respond(
        titlesFound.map((title) => ({
          name: `${title.title} (${title.release_date.split('-')[0]})`,
          value: `tmdb${title.id} - ${title.title} (${
            title.release_date.split('-')[0]
          })`,
        })),
      );
    }
    catch (e) {
      reportError(e, interaction);
    }
  },
};
