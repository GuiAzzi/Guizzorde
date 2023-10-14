import fetch from 'node-fetch';
import { configObj } from '../../../../config/index.js';
import { reportError } from '../../../../util/index.js';

/**
 * Searches for movies on TMDB and returns an array sorted by popularity
 * @param {string} title The movie title to search for
 * @param {boolean} [adult] If it should contain adult results
 * @param {string} locale The locale string that results should be based of
 * @param {string} primary_release_year
 * @param {number} page How many pages to return
 * @param {string} region
 * @param {string} year
 * @returns {Promise<[import('./tmdbTypes.js').TMDBSearchMovie>]} The array of TMDB title objects
 */
export const tmdbSearchMovie = async (title, adult = false, locale = 'en-US', primary_release_year, page = 1, region, year) => {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${configObj.tmdbApiKey}&query=${encodeURIComponent(title)}&include_adult=${adult}&language=${locale}}&primary_release_year=${primary_release_year}&page=${page}&region=${region}&year=${year}`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  };

  try {
    const res = await (await fetch(url, options)).json();
    return res.results?.sort((a, b) => b.popularity - a.popularity);
  }
  catch (e) {
    reportError(e);
    return null;
  }
};

/**
 * Searches for movies on TMDB and returns an array sorted by popularity
 * @param {string} tmdbId The TMDB's movie ID to fetch details
 * @param {string} [language] The language to have details in
 * @returns {Promise<import('./tmdbTypes.js').TMDBMovieWithCredits>} The array of TMDB title objects
 */
export const tmdbMovieDetailsAndCredits = async (tmdbId, language = 'en_US') => {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}}?api_key=${configObj.tmdbApiKey}&append_to_response=credits&language=${language}`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  };

  try {
    return await (await fetch(url, options)).json();
  }
  catch (e) {
    reportError(e);
    return null;
  }
};

/**
 * Searches TMDB on where to stream a movie
 * @param {number} tmdbId The movie's TMDB ID
 * @param {string} locale The locale string that results should be based of
 * @returns {Promise<import('./tmdbTypes.js').TMDBWatchProviders>} The array of TMDB watch providers
 */
export const tmdbWatchProviders = async (tmdbId, locale = 'pt_BR') => {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${configObj.tmdbApiKey}`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  };

  try {
    const res = (await (await fetch(url, options)).json()).results;

    if (locale === 'pt_BR') {
      return res['BR'] || null;
    }
    else if (locale === 'en_US') {
      return res['US'] || null;
    }
    else {
      return null;
    }
  }
  catch (e) {
    reportError(e);
    return null;
  }
};

