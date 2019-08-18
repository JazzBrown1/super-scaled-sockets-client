import sssUtil from './sssUtil';
import statusCodes from './statusCodes';
import plCodes from './plCodes';
import Subscription from './subscription';

const errors = {
  unknownSys: { name: 'Unknown payload type', message: 'Unknown payload type received from the server' },
  resIdNoMatch: { name: 'Received response with an unknown message ID', message: 'Unexpected Error: Response Id not in Id array' },
  unknownSubscription: { name: 'Received message for unsubscribed channel', message: 'Unknown channel on sub message sent from server' },
  connectionDropped: { name: 'Connection dropped', message: 'The connection dropped, unable to send message' },
  connectionUnready: { name: 'Connection not ready', message: 'The connection not ready, unable to send message' },
  channelSync: { name: 'Unable to sync', message: 'Unable to sync the channel' },
  unknownChannel: { name: 'Unknown channel', message: 'Received payload for unknown channel' },
  subMissing: { name: 'Cannot Locate Subscription', message: 'During unsubscribe process unable to locate subscription in subs stash' },
  channelMissing: { name: 'Cannot locate channel', message: 'During unsubscribe process unable to locate channel in channel object' },
  connectionFailed: { name: 'Unable to connect to the server', message: 'Unable to establish a connection with the WebSockets Error' },
  channelNameNotAllowed: { name: 'Channel name not allowed', message: 'Must be "A-Z 0-9 - _" with no spaces and no leading underscores' },
};

const defaults = {
  logReconnection: false,
  retryAttempts: 0,
  retryInterval: 5000,
  autoReconnect: true
};

const applyPrefs = (prefs) => {
  const _prefs = { ...defaults };
  Object.keys(prefs).forEach((key) => {
    if (_prefs[key] !== undefined) _prefs[key] = prefs[key];
    else console.log('SuperScaledSockets', `Unknown preference name '${key}' passed to server`);
  });
  if (_prefs.retryInterval < 1000) _prefs.retryInterval = 1000;
  return _prefs;
};

/** Class Instance returned by the client() call in the super-scaled-sockets-client module
 *  @hideconstructor
 * @memberof super-scaled-sockets-client

 */
class Client {
  constructor(url, prefs) {
    this._url = url;
    this._prefs = applyPrefs(prefs);
    this._status = statusCodes.client.INIT;
    this._connection = null;
    this._tellListeners = {};
    this._broadcastListeners = {};
    this._onConnect = null;
    this._onError = null;
    this._onReconnect = null;
    this._onDrop = null;
    this._onBoot = null;
    this._onReconnectFail = null;
    this._onStatusChange = null;
    this._channels = {};
    this._responseCallbacks = new sssUtil.Stash();
    this._queryStore = {};
    this._hbTimeout = null;
    this._hbInterval = 31000;
    this._msgQueue = [];
  }

  _send(payload) {
    this._connection.send(JSON.stringify(payload));
  }

  _createSubscription(channel, query, lastUid) {
    if (!this._channels[channel]) {
      this._channels[channel] = { query: query, subscriptions: new sssUtil.Stash(), lastUid: lastUid };
    }
    const id = this._channels[channel].subscriptions.put(0);
    const _subscription = new Subscription(this, channel, id);
    this._channels[channel].subscriptions.replace(id, _subscription);
    return _subscription;
  }

  _removeSubscription(channel, id) {
    if (!this._channels[channel]) {
      this._handleError(errors.channelMissing, { channel: channel, channels: this._channels });
      return;
    }
    const subscription = this._channels[channel].subscriptions.take(id);
    if (!subscription) {
      this._handleError(errors.subMissing, { id: id, subs: this._channels[channel].subscriptions });
      return;
    }
    if (this._channels[channel].subscriptions.isEmpty()) {
      this._removeChannel(channel);
    }
  }

  _removeChannel(channel) {
    if (this._channels[channel]) delete this._channels[channel];
    this._send({ sys: plCodes.UNSUBSCRIBE, channel: channel });
  }

  _handleClose(clientCode, subscriptionCode) {
    this._connection.close();
    this._connection = null;
    this._setStatus(clientCode);
    this._responseCallbacks.iterate((cb) => {
      cb(errors.connectionDropped, null);
    });
    this._responseCallbacks.clear();
    Object.keys(this._channels).forEach((key) => {
      this._channels[key].subscriptions.iterate((subscription) => {
        subscription._setStatus(subscriptionCode);
      });
    });
    if (this._onDrop) this._onDrop();
  }

  _handleBroadcast(payload) {
    if (this._broadcastListeners[payload.topic]) this._broadcastListeners[payload.topic](payload.msg);
  }

  _handleSyncStart() {
    Object.keys(this._channels).forEach((key) => {
      this._channels[key].subscriptions.iterate((subscription) => {
        subscription._setStatus(statusCodes.subscription.SYNCING);
      });
    });
  }

  _handleSyncComplete(results) {
    this._setStatus(statusCodes.client.READY);
    Object.keys(this._channels).forEach((key) => {
      if (results[key]) {
        this._channels[key].subscriptions.iterate((subscription) => {
          subscription._setStatus(statusCodes.subscription.ACTIVE);
        });
      } else {
        this._channels[key].subscriptions.iterate((subscription) => {
          subscription._handleError(errors.channelSync, statusCodes.subscription.SYNC_FAILED);
        });
      }
    });
    if (this._onReconnect) this._onReconnect();
  }

  _handleSubscribe(payload) {
    const subCb = this._responseCallbacks.take(payload.id);
    if (!subCb) {
      this._handleError(errors.resIdNoMatch);
      return;
    }
    if (payload.result && !payload.err) {
      const channel = this._createSubscription(payload.channel, this._queryStore[payload.id], payload.lastUid);
      delete this._queryStore[payload.id];
      subCb(payload.err, payload.result, channel);
      return;
    }
    subCb(payload.err, payload.result);
  }

  _handleResponse(payload) {
    const resCb = this._responseCallbacks.take(payload.id);
    if (!resCb) {
      this._handleError(errors.resIdNoMatch);
    } else {
      resCb(payload.err, payload.msg);
    }
  }

  _handleFeed(payload) {
    if (this._channels[payload.channel]) {
      this._channels[payload.channel].lastUid = payload.uid;
      this._channels[payload.channel].subscriptions.iterate((subscription) => {
        subscription._handleFeed(payload.topic, payload.msg, payload.uid);
      });
    } else {
      this._handleError(errors.unknownChannel);
    }
  }

  _handleTell(payload) {
    if (this._tellListeners[payload.topic]) {
      this._tellListeners[payload.topic](payload.msg);
    }
  }

  _setStatus(status) {
    if (status !== this._status) {
      if (this._onStatusChange) {
        const oldStatus = this._status;
        this._status = status;
        this._onStatusChange(status, oldStatus);
      } else this._status = status;
    }
  }

  _handleError(error, details, status) {
    console.error('SuperScaledSockets', error, { errorDetails: details || 'none' });
    if (this._onError && error) this._onError(error);
    if (status) this._setStatus(status);
  }

  _handleReconnect() {
    const connectSuccess = () => {
      this._handleSyncStart();
      const subscriptions = [];
      Object.keys(this._channels).forEach((key) => {
        const subscription = {
          channel: key,
          lastUid: this._channels[key].lastUid,
          query: this._channels[key].query
        };
        subscriptions.push(subscription);
      });
      const _req = { sys: plCodes.SYNC, subscriptions: subscriptions };
      if (this._prefs.logReconnection) console.log('SuperScaledSockets', { type: 'syncRequest', request: _req });
      this._send(_req);
    };
    this._setStatus(statusCodes.client.DROPPED_RETRYING);
    this._connectHandler(
      this._prefs.retryAttempts,
      this._prefs.retryInterval,
      statusCodes.client.DROPPED_RETRYING,
      statusCodes.client.RETRY_INTERVAL,
      statusCodes.client.RECONNECT_FAILED,
      statusCodes.client.SYNCING,
      connectSuccess,
      (e) => {
        this.handleError(e);
        if (this._onReconnectFail) this._onReconnectFail();
      }
    );
  }

  _connectHandler(attempts, interval, retryStatus, waitingStatus, failedStatus, successStatus, successCallback, failedCallback) {
    let attempt = 0;
    const go = () => {
      if (attempt !== 0) this._setStatus(retryStatus);
      attempt++;
      // will remove the console logs for proper debug logic at some point
      if (this._prefs.logReconnection) console.log('SuperScaledSockets', { type: 'connectionAttempt', reconnectAttempt: attempt });
      this._makeConnection((error, _connection) => {
        if (!error) {
          if (this._prefs.logReconnection) console.log('SuperScaledSockets', { type: 'connectionSuccessful', message: 'attempt successful' });
          this._setStatus(successStatus);
          this._connection = _connection;
          successCallback(_connection);
        } else if (attempt === attempts) {
          if (this._prefs.logReconnection) console.log('SuperScaledSockets', { type: 'connectionFailed', message: 'final attempt failed. Unable to establish connection with server' });
          this._setStatus(failedStatus);
          failedCallback(error);
        } else {
          if (this._prefs.logReconnection) console.log('SuperScaledSockets', { type: 'connectionAttemptFailed', message: `connection attempt ${attempt} attempt failed. Unable to establish connection with server` });
          this._setStatus(waitingStatus);
          setTimeout(go, interval);
        }
      });
    };
    go();
  }

  _handleStartMessage(payload) {
    switch (payload.sys) {
      case plCodes.BEGIN:
        if (payload.prot.hb) {
          this._hbInterval = payload.prot.hbInterval + (payload.prot.hbThreshold || 1000);
          this._handleHeartbeat();
        }
        if (payload.channel) {
          const userSub = this._createSubscription(payload.channel, null, payload.lastUid);
          this._setStatus(statusCodes.client.READY);
          this._onConnect(null, userSub);
        } else {
          this._setStatus(statusCodes.client.READY);
          this._onConnect(null, null);
        }
        this._msgQueue.forEach((_payload) => this._handleMessage(_payload));
        this._msgQueue.length = 0;
        break;
      case plCodes.SYNC:
        payload.records.forEach((record) => {
          this._handleFeed(record);
        });
        this._handleSyncComplete(payload.result);
        this._msgQueue.forEach((_payload) => this._handleMessage(_payload));
        this._msgQueue.length = 0;
        break;
      default:
        this._msgQueue.push(payload);
    }
  }

  _handleMessage(payload) {
    switch (payload.sys) {
      case plCodes.FEED:
        this._handleFeed(payload);
        break;
      case plCodes.RESPONSE:
        this._handleResponse(payload);
        break;
      case plCodes.TELL:
        this._handleTell(payload);
        break;
      case plCodes.SUBSCRIBE:
        this._handleSubscribe(payload);
        break;
      case plCodes.BEGIN:
        if (payload.prot.hb) {
          this._hbInterval = payload.prot.hbInterval + (payload.prot.hbThreshold || 1000);
          this._handleHeartbeat();
        }
        if (payload.channel) {
          const userSub = this._createSubscription(payload.channel, null, payload.lastUid);
          this._setStatus(statusCodes.client.READY);
          this._onConnect(null, userSub);
        } else {
          this._setStatus(statusCodes.client.READY);
          this._onConnect(null, null);
        }
        break;
      case plCodes.SYNC:
        payload.records.forEach((record) => {
          this._handleFeed(record);
        });
        this._handleSyncComplete(payload.result);
        break;
      case plCodes.BROADCAST:
        this._handleBroadcast(payload);
        break;
      case plCodes.BOOT:
        this._connection.close(4001, payload.reason);
        break;
      default:
        this._handleError(errors.unknownSys);
    }
  }

  _handleHeartbeat() {
    clearTimeout(this._hbTimeout);
    this._hbTimeout = setTimeout(() => {
      this._connection.close(4100, 'The socket did not receive a heartbeat');
    }, this._hbInterval);
  }

  _makeConnection(callback) {
    const connection = new WebSocket(this._url);
    // the on error creates a connection error if the connection is not established
    connection.onerror = () => {
      connection.close(4999, 'ignore'); // ensure connection has closed
      callback(true, null);
    };
    connection.onopen = () => {
      // remove our on startup error function and handle errors normally now we've now connected successfully
      connection.onerror = (e) => {
        this._handleError(e);
      };
      connection.onmessage = (e) => {
        if (e.data === 'h') {
          this._handleHeartbeat();
          this._connection.send('h');
          return;
        }
        const payload = JSON.parse(e.data);
        if (payload.sys) {
          if (this._status === statusCodes.client.READY) this._handleMessage(payload);
          else this._handleStartMessage(payload);
        }
        if (payload.err) {
          this._handleError(payload.err);
        }
      };
      connection.onclose = (e) => {
        if (this._hbTimeout) clearTimeout(this._hbTimeout);
        switch (e.code) {
          case 4999: // Internal Ignore close
            // ignore
            break;
          case 4000: // Closed by Client
            this._handleClose(statusCodes.client.CLOSED, statusCodes.subscription.CLOSED);
            break;
          case 4001: // Booted by Server
            this._handleClose(statusCodes.client.BOOTED, statusCodes.subscription.BOOTED);
            if (this._onBoot) this._onBoot(e.reason);
            break;
          default: // Inconsistent client generated code usually 1006 on chrome
            if (this._prefs.autoReconnect) {
              this._handleClose(statusCodes.client.DROPPED_RETRYING, statusCodes.subscription.DROPPED);
              this._handleReconnect();
            } else {
              this._handleClose(statusCodes.client.RECONNECT_FAILED, statusCodes.subscription.RECONNECT_FAILED);
              if (this.onReconnectFail) this._onReconnectFail();
            }
            break;
        }
      };
      callback(null, connection);
    };
  }

  /**
   * Callback function that is called after a connection request is made to the server.
   *
   * @callback connectCallback
   * @param {errorObject} error If there is an error an error object will return, otherwise null.
   * @param {Subscription} userSubscription Returns a user subscription if one is assigned by the server, otherwise null.
   */
  /**
     * Connect to the server.
  * @param {connectCallback} callback - Callbacks with an error if unable to connect and a user subscription if one is assigned by the server
    * @example
    * client.connect((err, userSubscription) => {
    *   if (err) {
    *     // handle the error
    *     return;
    *   }
    *   // ........
  */
  connect(callback) {
    this._onConnect = callback;
    this._setStatus(statusCodes.client.STARTING);

    let _attempts = 1;
    if (this._prefs.autoReconnect) {
      _attempts = this._prefs.retryAttempts === 0 ? this._prefs.retryAttempts : 1 + this._prefs.retryAttempts;
    }
    this._connectHandler(
      _attempts,
      this._prefs.retryInterval,
      statusCodes.client.START_RETRYING,
      statusCodes.client.RETRY_INTERVAL,
      statusCodes.client.START_FAILED,
      statusCodes.client.BEGINNING,
      () => {
        this._send({ sys: plCodes.BEGIN });
      },
      (e) => {
        this.handleError(e);
        if (this._onConnect) this.onConnect(errors.connectionFailed, null);
      }
    );
  }

  /**
  * Called when the client wishes to close the connection connection with the server.
  * @example
  * client.close() // close connection with the server
  */
  close() {
    this._connection.close(4000, 'Connection closed by client');
  }

  /**
     * Returns the current status of the client connection.
  * @return {statusCode} The status of the client  as a status code.
  * @example
  * const currentStatus = client.getStatus();
  * const currentStatusText = sssc.client.statusText[currentStatus];
  * console.log('Current Status', currentStatusText);
  */
  getStatus() {
    return this._status;
  }

  /**
   * Callback function that is called when a message is received from the server
   *
   * @callback onTellCallback
   * @param {any} msg - Message received from the server.
   */

  /**
  * Set the listener for tell requests from the server.
  * @param {text} topic The topic name to listen for.
  * @param {onTellCallback} callback The function called when an event with the matching topic is heard.
  * @example
  * client.onTell(('server-message', msg) => {
  *   someDisplayFunction(msg);
  * });
  */
  onTell(topic, callback) {
    this._tellListeners[topic] = callback;
  }
  /**
   * Callback function that is called when a message is received from the server.
   *
   * @callback onBroadcastCallback
   * @param {any} msg - Message received from the server.
   */

  /**
     * Set the listener for broadcasts from the server.
  * @param {text} topic The topic name to listen for.
  * @param {onBroadcastCallback} callback The function called when an event with the matching topic is heard.
  * @example
  * client.onBroadcast('alert', (msg) => {
  *   alert(msg);
  * });
  */
  onBroadcast(topic, callback) {
    this._broadcastListeners[topic] = callback;
  }

  /**
   * Callback function that is called when an error occurs.
   *
   * @callback onErrorCallback
   * @param {errorObject} error - Message received from the server.
   */

  /**
     * Set the listener for error events.
  * @param {onErrorCallback} callback The function called when an error occurs.
  * @example
  * client.onError((err) => {
  *   console.log('Error Name', err.name, 'Error Code': err.code, 'Error Message', err.message);
  * });
  */
  onError(callback) {
    this._onError = callback;
  }

  /**
   * Callback function called after a connection dropped and once the connection is reestablished and subscriptions are synced.
   *
   * @callback onReconnectCallback
   */

  /**
     * Set the listener for reconnection events reconnect events. Will be called when the connection has dropped and the reconnection attempt was successful.
  * @param {onReconnectCallback} callback The function called after a connection drop once the connection is re-established and subscriptions are synced.
  * @example
  * client.onReconnect(() => {
  *   alert('Successfully reconnected')
  * });
  */
  onReconnect(callback) {
    this._onReconnect = callback;
  }

  /**
   * Callback function called after on a connection drop.
   *
   * @callback onDropCallback
   */

  /**
     * Set the listener for connection drop events.
  * @param {onDropCallback} callback The function called after on a connection drop.
  * @example
  * client.onDrop(() => {
  *   alert('Your connection has dropped, attempting reconnection');
  * });
  */
  onDrop(callback) {
    this._onDrop = callback;
  }

  /**
   * Callback function called when cannot re-establish a connection with the server and the retry attempts are exhausted.
   *
   * @callback onReconnectFailCallback
   */

  /**
     * Set the listener for failed reconnection events. Called when cannot re-establish a connection with the server and the retry attempts are exhausted.
  * @param {onReconnectFailCallback} callback The function called when cannot re-establish a connection with the server and the retry attempts are exhausted.
  * @example
  * client.onReconnectFail(() => {
  *   alert('We have been unable to reconnect to the server');
  * });
  */
  onReconnectFail(callback) {
    this._onReconnectFail = callback;
  }

  /**
   * Callback function called when the client is booted from the server.
   *
   * @callback onBootCallback
   * @param {text} reason Reason defined by the server.
   */

  /**
     * Set the listener for boot events.
  * @param {onBootCallback} callback The function called when the client is booted from the server.
  * @example
  * client.onBoot((reason) => {
  *   console.log('You were booted from the server, reason:', reason);
  * });
  */
  onBoot(callback) {
    this._onBoot = callback;
  }

  /**
   * Callback function called when the client is booted from the server.
   *
   * @callback onStatusChangeCallback
   * @param {number} newStatus The new status as a status code.
   * @param {number} previousStatus The previous status as a status code.
   */

  /**
     * Set the listener for client status changes.
  * @param {onStatusChangeCallback} callback The function called with the updated status.
  * @example
  * const statusCodes = sssc.statusCodes.client; // Make a reference to the client status codes
  * client.onStatusChange( (newStatus) => {
  *   if (newStatus === statusCodes.START_RETRYING) alert('Having problems connecting to the server, we\'re retrying');
  * })
  */
  onStatusChange(callback) {
    this._onStatusChange = callback;
  }

  /**
   * Callback function called from an ask request with the response or an error.
   *
   * @callback askCallback
   * @param {errorObject} error If there is an error an error object will return, otherwise null.
   * @param {any} response The response message from the server.
   */

  /**
     * Make an ask request to the server. Used when a response is required. If not use client.tell()
  * @param {text} topic The topic of the message. Used for the listener on the server side.
  * @param {any} msg The message to deliver to the server.
  * @param {askCallback} callback The function called with the response or an error.
  * @example
  * client.ask('get-update', myMessage, (err, response) => {
  *   if (err){
  *     // handle the error
  *     return;
  *   }
  *   // do something with response
  * });
  */
  ask(topic, msg, callback) {
    if (this._status === statusCodes.client.READY) {
      // Should add datetimes to all requests and set a time put to check that responses have been received no other way to confirm delivery
      // const _id = this._responseCallbacks.put({cb: callback, time: Date.now()})
      const _id = this._responseCallbacks.put(callback);
      this._send({
        sys: plCodes.ASK, topic: topic, msg: msg, id: _id
      });
    } else {
      callback(errors.connectionUnready);
    }
  }

  /**
   * Callback function called from an ask request with an error if one occurs.
   *
   * @callback tellCallback
   * @param {errorObject} error If there is an error an error object will return, otherwise null.
   */

  /**
     * Make a tell request to the server. Used when a response is not required. If a response is required use client.ask()
  * @param {text} topic The topic of the message. Used for the listener on the server side.
  * @param {any} msg The message to deliver to the server.
  * @param {tellCallback} callback The function called with the an error if one occurs.
  * @example
  * client.tell('chat-message', {to: someUserName, msg: someMessage}, (err) => if (err) alert('We have encountered an error'));
  */

  tell(topic, msg, callback) {
    if (this._status === statusCodes.client.READY) {
      this._send({ sys: plCodes.TELL, topic: topic, msg: msg });
      if (callback) callback(null);
    } else if (callback) callback(errors.connectionUnready);
  }

  /**
   * Callback function called after a subscription request is made.
   *
   * @callback subscribeCallback
   * @param {errorObject} error If there is an error an error object will return, otherwise null.
   * @param {Subscription} Subscription If successful a subscription instance will be returned
   */

  /**
    * A text string containing only letters, numbers, hyphens and underscores. With no leading hyphens or underscores.
    * @typedef channelName
    */

  /**
     * Make a subscription request.
  * @param {channelName} channelName The channelName which the client wants to subscribe to.
  * @param {any} query Optional data to transmit which can be used by the subscription parser on the server side.
  * @param {subscribeCallback} callback The function called after a subscription request is made.
  * @example
  * client.subscribe('sport-news', null, (err, subscription) => {
  *   if (err) {
  *     console.log(err);
  *     alert('error subscribing');
  *     return;
  *   }
  *   subscription.on('new-article', (msg) => {
  *     someDisplayFunction(msg);
  *   });
  * })
  */


  subscribe(channel, query, callback) {
    if (this._status !== statusCodes.client.READY) {
      callback(errors.connectionUnready);
      return;
    }
    if (!/^(?!_)^[a-zA-Z0-9_-]*$/.test(channel) || channel === undefined || channel == null) {
      callback(errors.channelNameNotAllowed);
      return;
    }
    if (this._channels[channel]) {
      const subscription = this._createSubscription(channel);
      callback(null, subscription);
    } else {
      console.log('sending sub request, channel: ', channel);
      const _id = this._responseCallbacks.put(callback);
      this._queryStore[_id] = query;
      const _req = {
        sys: plCodes.SUBSCRIBE, channel: channel, query: query, id: _id
      };
      this._send(_req);
    }
  }
}

export default Client;
