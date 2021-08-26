import {
    client,
    configObj,
} from '../config/index.js';

/**
 * Logs an error and tries to message owner
 * @param {string} err 
 */
export function reportError(err) {
    console.error('APP Error', err);
    client.users.fetch(configObj.ownerId)
        .then((owner) => owner.send({ content: err }));
}