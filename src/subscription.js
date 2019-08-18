import statusCodes from './statusCodes';

/** Class Instance returned when a subscription request is successful
 *  @hideconstructor
 * @memberof super-scaled-sockets-client
 */
class Subscription {
  constructor(client, channel, id) {
    this._client = client;
    this._status = statusCodes.subscription.ACTIVE;
    this._id = id;
    this._channel = channel;
    this._onError = null;
    this._onStatusChange = null;
    this._listeners = {};
  }

  _handleFeed(topic, msg, uid) {
    if (this._listeners[topic]) {
      this._listeners[topic](msg, uid);
    }
  }

  _setStatus(status) {
    if (this._onStatusChange) {
      const oldStatus = this._status;
      this._status = status;
      this._onStatusChange(status, oldStatus);
    } else this._status = status;
  }

  _handleError(error, status) {
    if (this._onError) this._onError(error);
    if (status) this._setStatus(status);
  }
  /**
   * Callback function that is called when a subscription message is received from the server.
   *
   * @callback onSubscriptionMessageCallback
   * @param {any} msg - Message received from the server.
   */

  /**
  * Listener for subscription messages from the server
  * @param {text} topic The topic name to listen for.
  * @param {onSubscriptionMessageCallback} callback The function called when an event with the matching topic is heard.
  * @example
  * subscription.on('chat-message', (msg) => {
  *   someAddMessageFunction(msg);
  * });
  */
  on(topic, callback) {
    this._listeners[topic] = callback;
  }

  /**
     * Close this instance of your subscription. If you have other instances of this subscription open elsewhere in your app they will remain open.
     * @example
     * someClickListener((e) => {
     *   subscription.unsubscribe();
     * });
  */
  unsubscribe() {
    this._client._removeSubscription(this._channel, this._id);
  }

  /**
     * Returns the client status.
  * @return {number} The status of the client  as a status code.
  * @example
  * const currentStatus = subscription.getStatus();
  * const currentStatusText = sssc.statusText.subscription[currentStatus];
  * console.log('Current Status', currentStatusText);
  */
  getStatus() {
    return this._status;
  }

  /**
  * Listener for subscription status changes.
  * @param {onStatusChangeCallback} callback The function called with the updated status.
  */
  onStatusChange(callback) {
    this._onStatusChange = callback;
  }

  /**
  * Listener for errors
  * @param {onErrorCallback} callback The function called when an error occurs
  * @example
  * subscription.onError((err) => {
  *   console.log('Error Name', err.name, 'Error Code': err.code, 'Error Message', err.message);
  * });
  */
  onError(callback) {
    this._onError = callback;
  }
}

export default Subscription;
