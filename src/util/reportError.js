import { configObj, client } from '../config/index.js'

/**
 * @param {string} err 
 */
export function reportError(err) {
    console.error(err);
    client.users.fetch(configObj.ownerId)
        .then((owner) => owner.send(err));
}