import statusCodes from './statusCodes';
import Client from './client';

const statusText = {
  subscription: {},
  client: {}
};
Object.keys(statusCodes.subscription).forEach((key) => {
  statusText.subscription[statusCodes.subscription[key]] = key;
});
Object.keys(statusCodes.client).forEach((key) => {
  statusText.client[statusCodes.client[key]] = key;
});


const client = (url, options, callback) => {
  const _client = new Client(url, options);
  if (callback) callback(_client);
  return _client;
};

/** Status codes are integer codes which represent the status of a client or subscription
 * @typedef statusCode
*/

/** Root module for the library called with import sssc from 'super-scaled-sockets-client'
 * @example
 * import sssc from 'super-scaled-sockets-client';
 * @module super-scaled-sockets-client */
export {
  /** Function called to create a client instance
  * @function
  * @param {text} url - The URL and of the serve
  * @param {object} options - An options object
  * @param {boolean} [options.logReconnection=false] - Whether to show connection logs on the console.log.
  * @param {number} [options.retryAttempts=0] - Maximum connection retry  attempts, if set to 0 will retry infinitely.
  * @param {number} [options.retryInterval=5000] - Interval between connection retry attempts in milliseconds.
  * @param {boolean} [options.autoReconnect=true] - Whether to auto reconnect on connection drop or failed connection attempt.
  * @return {Client}
  * @example
  * import sssc from 'super-scaled-sockets-client';
  * const sssUrl = 'localhost:443'
  * const sssOptions = {
  *   retryAttempts: 10,
  *   retryInterval: 10000
  * }
  * const client = sssc.client(sssUrl, sssOptions);
  */
  client,
  /** This is a description of the status codes
   * @typedef statusCodesObject
   * @example
   * client.onStatusChange((status) => {
   *   if (status === sssc.statusCodes.client.DROPPED_RETRYING) showReconnectingMessage();
   * });
   * @property {Object} client - Subscription status codes
   * @property {statusCode} client.INIT - 0
   * @property {statusCode} client.STARTING - 1
   * @property {statusCode} client.START_RETRYING - 2
   * @property {statusCode} client.DROPPED_RETRYING - 3
   * @property {statusCode} client.START_FAILED - 4
   * @property {statusCode} client.RETRY_INTERVAL - 5
   * @property {statusCode} client.RECONNECT_FAILED - 6
   * @property {statusCode} client.READY - 7
   * @property {statusCode} client.SYNCING - 8
   * @property {statusCode} client.BEGINNING - 9
   * @property {statusCode} client.BOOTED - 10
   * @property {statusCode} client.CLOSED - 11
   * @property {Object} subscription - Subscription status codes
   * @property {statusCode} subscription.ACTIVE - 1
   * @property {statusCode} subscription.DROPPED - 2
   * @property {statusCode} subscription.SYNCING - 3
   * @property {statusCode} subscription.SYNC_FAILED - 4
   * @property {statusCode} subscription.UNSUBSCRIBED - 5
   * @property {statusCode} subscription.BOOTED - 6
   * @property {statusCode} subscription.CLOSED - 7
   * @property {statusCode} subscription.RECONNECT_FAILED - 8
   */
  statusCodes,
  statusText
};
export default {
  client: client,
  statusCodes,
  statusText
};
