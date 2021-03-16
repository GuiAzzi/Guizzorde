import configObj, { client } from '../config/Config.class.js'

/**
 * 
 * @param {string} err 
 */
export function reportError(err) {
    console.error(err);
    client.users.fetch(configObj.ownerId)
        .then((owner) => owner.send(err));
}