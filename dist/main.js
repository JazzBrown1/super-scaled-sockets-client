'use strict';

var jazzyUtility = require('jazzy-utility');

var statusCodes = {
  client: {
    INIT: 0,
    STARTING: 1,
    START_RETRYING: 2,
    DROPPED_RETRYING: 3,
    START_FAILED: 4,
    RETRY_INTERVAL: 5,
    RECONNECT_FAILED: 6,
    READY: 7,
    SYNCING: 8,
    BEGINNING: 9,
    BOOTED: 10,
    CLOSED: 11
  },
  subscription: {
    ACTIVE: 1,
    DROPPED: 2,
    SYNCING: 3,
    SYNC_FAILED: 4,
    UNSUBSCRIBED: 5,
    BOOTED: 6,
    CLOSED: 7,
    RECONNECT_FAILED: 8
  }
};

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    });
    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(source, true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(source).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

var plCodes = {
  SUBSCRIBE: 1,
  UNSUBSCRIBE: 2,
  BEGIN: 3,
  SYNC: 4,
  ASK: 5,
  TELL: 6,
  RESPONSE: 7,
  FEED: 8,
  BOOT: 9,
  BOOTCHANNEL: 10,
  BROADCAST: 11,
  UPDATESUB: 12
};

/** Class Instance returned when a subscription request is successful
 *  @hideconstructor
 * @memberof super-scaled-sockets-client
 */

var Subscription =
/*#__PURE__*/
function () {
  function Subscription(client, channel, id) {
    _classCallCheck(this, Subscription);

    this._client = client;
    this._status = statusCodes.subscription.ACTIVE;
    this._id = id;
    this._channel = channel;
    this._onError = null;
    this._onStatusChange = null;
    this._listeners = {};
  }

  _createClass(Subscription, [{
    key: "_handleFeed",
    value: function _handleFeed(topic, msg, uid) {
      if (this._listeners[topic]) {
        this._listeners[topic](msg, uid);
      }
    }
  }, {
    key: "_setStatus",
    value: function _setStatus(status) {
      if (this._onStatusChange) {
        var oldStatus = this._status;
        this._status = status;

        this._onStatusChange(status, oldStatus);
      } else this._status = status;
    }
  }, {
    key: "_handleError",
    value: function _handleError(error, status) {
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

  }, {
    key: "on",
    value: function on(topic, callback) {
      this._listeners[topic] = callback;
    }
    /**
       * Close this instance of your subscription. If you have other instances of this subscription open elsewhere in your app they will remain open.
       * @example
       * someClickListener((e) => {
       *   subscription.unsubscribe();
       * });
    */

  }, {
    key: "unsubscribe",
    value: function unsubscribe() {
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

  }, {
    key: "getStatus",
    value: function getStatus() {
      return this._status;
    }
    /**
    * Listener for subscription status changes.
    * @param {onStatusChangeCallback} callback The function called with the updated status.
    */

  }, {
    key: "onStatusChange",
    value: function onStatusChange(callback) {
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

  }, {
    key: "onError",
    value: function onError(callback) {
      this._onError = callback;
    }
  }]);

  return Subscription;
}();

var errors = {
  unknownSys: {
    name: 'Unknown payload type',
    message: 'Unknown payload type received from the server'
  },
  resIdNoMatch: {
    name: 'Received response with an unknown message ID',
    message: 'Unexpected Error: Response Id not in Id array'
  },
  unknownSubscription: {
    name: 'Received message for unsubscribed channel',
    message: 'Unknown channel on sub message sent from server'
  },
  connectionDropped: {
    name: 'Connection dropped',
    message: 'The connection dropped, unable to send message'
  },
  connectionUnready: {
    name: 'Connection not ready',
    message: 'The connection not ready, unable to send message'
  },
  channelSync: {
    name: 'Unable to sync',
    message: 'Unable to sync the channel'
  },
  unknownChannel: {
    name: 'Unknown channel',
    message: 'Received payload for unknown channel'
  },
  subMissing: {
    name: 'Cannot Locate Subscription',
    message: 'During unsubscribe process unable to locate subscription in subs stash'
  },
  channelMissing: {
    name: 'Cannot locate channel',
    message: 'During unsubscribe process unable to locate channel in channel object'
  },
  connectionFailed: {
    name: 'Unable to connect to the server',
    message: 'Unable to establish a connection with the WebSockets Error'
  },
  channelNameNotAllowed: {
    name: 'Channel name not allowed',
    message: 'Must be "A-Z 0-9 - _" with no spaces and no leading underscores'
  }
};
var defaults = {
  logReconnection: false,
  retryAttempts: 0,
  retryInterval: 5000,
  autoReconnect: true
};

var applyPrefs = function applyPrefs(prefs) {
  var _prefs = _objectSpread2({}, defaults);

  Object.keys(prefs).forEach(function (key) {
    if (_prefs[key] !== undefined) _prefs[key] = prefs[key];else console.log('SuperScaledSockets', "Unknown preference name '".concat(key, "' passed to server"));
  });
  if (_prefs.retryInterval < 1000) _prefs.retryInterval = 1000;
  return _prefs;
};
/** Class Instance returned by the client() call in the super-scaled-sockets-client module
 *  @hideconstructor
 */


var Client =
/*#__PURE__*/
function () {
  function Client(url, prefs) {
    _classCallCheck(this, Client);

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
    this._responseCallbacks = new jazzyUtility.Stash();
    this._queryStore = {};
    this._hbTimeout = null;
    this._hbInterval = 31000;
    this._msgQueue = [];
  }

  _createClass(Client, [{
    key: "_send",
    value: function _send(payload) {
      this._connection.send(JSON.stringify(payload));
    }
  }, {
    key: "_createSubscription",
    value: function _createSubscription(channel, query, lastUid) {
      if (!this._channels[channel]) {
        this._channels[channel] = {
          query: query,
          subscriptions: new jazzyUtility.Stash(),
          lastUid: lastUid
        };
      }

      var id = this._channels[channel].subscriptions.put(0);

      var _subscription = new Subscription(this, channel, id);

      this._channels[channel].subscriptions.replace(id, _subscription);

      return _subscription;
    }
  }, {
    key: "_removeSubscription",
    value: function _removeSubscription(channel, id) {
      if (!this._channels[channel]) {
        this._handleError(errors.channelMissing, {
          channel: channel,
          channels: this._channels
        });

        return;
      }

      var subscription = this._channels[channel].subscriptions.take(id);

      if (!subscription) {
        this._handleError(errors.subMissing, {
          id: id,
          subs: this._channels[channel].subscriptions
        });

        return;
      }

      if (this._channels[channel].subscriptions.isEmpty()) {
        this._removeChannel(channel);
      }
    }
  }, {
    key: "_removeChannel",
    value: function _removeChannel(channel) {
      if (this._channels[channel]) delete this._channels[channel];
      if (this._status === statusCodes.client.READY) this._send({
        sys: plCodes.UNSUBSCRIBE,
        channel: channel
      });
    }
  }, {
    key: "_handleClose",
    value: function _handleClose(clientCode, subscriptionCode) {
      var _this = this;

      this._connection.close();

      this._connection = null;

      this._setStatus(clientCode);

      this._responseCallbacks.iterate(function (cb) {
        cb(errors.connectionDropped, null);
      });

      this._responseCallbacks.clear();

      Object.keys(this._channels).forEach(function (key) {
        _this._channels[key].subscriptions.iterate(function (subscription) {
          subscription._setStatus(subscriptionCode);
        });
      });
      if (this._onDrop) this._onDrop();
    }
  }, {
    key: "_handleBroadcast",
    value: function _handleBroadcast(payload) {
      if (this._broadcastListeners[payload.topic]) this._broadcastListeners[payload.topic](payload.msg);
    }
  }, {
    key: "_handleSyncStart",
    value: function _handleSyncStart() {
      var _this2 = this;

      Object.keys(this._channels).forEach(function (key) {
        _this2._channels[key].subscriptions.iterate(function (subscription) {
          subscription._setStatus(statusCodes.subscription.SYNCING);
        });
      });
    }
  }, {
    key: "_handleSyncComplete",
    value: function _handleSyncComplete(results) {
      var _this3 = this;

      this._setStatus(statusCodes.client.READY);

      Object.keys(this._channels).forEach(function (key) {
        if (results[key]) {
          _this3._channels[key].subscriptions.iterate(function (subscription) {
            subscription._setStatus(statusCodes.subscription.ACTIVE);
          });
        } else {
          _this3._channels[key].subscriptions.iterate(function (subscription) {
            subscription._handleError(errors.channelSync, statusCodes.subscription.SYNC_FAILED);
          });
        }
      });
      if (this._onReconnect) this._onReconnect();
    }
  }, {
    key: "_handleSubscribe",
    value: function _handleSubscribe(payload) {
      var subCb = this._responseCallbacks.take(payload.id);

      if (!subCb) {
        this._handleError(errors.resIdNoMatch);

        return;
      }

      if (payload.result && !payload.err) {
        var channel = this._createSubscription(payload.channel, this._queryStore[payload.id], payload.lastUid);

        delete this._queryStore[payload.id];
        subCb(payload.err, payload.result, channel);
        return;
      }

      subCb(payload.err, payload.result);
    }
  }, {
    key: "_handleResponse",
    value: function _handleResponse(payload) {
      var resCb = this._responseCallbacks.take(payload.id);

      if (!resCb) {
        this._handleError(errors.resIdNoMatch);
      } else {
        resCb(payload.err, payload.msg);
      }
    }
  }, {
    key: "_handleFeed",
    value: function _handleFeed(payload) {
      if (this._channels[payload.channel]) {
        this._channels[payload.channel].lastUid = payload.uid;

        this._channels[payload.channel].subscriptions.iterate(function (subscription) {
          subscription._handleFeed(payload.topic, payload.msg, payload.uid);
        });
      } else {
        this._handleError(errors.unknownChannel);
      }
    }
  }, {
    key: "_handleTell",
    value: function _handleTell(payload) {
      if (this._tellListeners[payload.topic]) {
        this._tellListeners[payload.topic](payload.msg);
      }
    }
  }, {
    key: "_setStatus",
    value: function _setStatus(status) {
      if (status !== this._status) {
        if (this._onStatusChange) {
          var oldStatus = this._status;
          this._status = status;

          this._onStatusChange(status, oldStatus);
        } else this._status = status;
      }
    }
  }, {
    key: "_handleError",
    value: function _handleError(error, details, status) {
      console.error('SuperScaledSockets', error, {
        errorDetails: details || 'none'
      });
      if (this._onError && error) this._onError(error);
      if (status) this._setStatus(status);
    }
  }, {
    key: "_handleReconnect",
    value: function _handleReconnect() {
      var _this4 = this;

      var connectSuccess = function connectSuccess() {
        _this4._handleSyncStart();

        var subscriptions = [];
        Object.keys(_this4._channels).forEach(function (key) {
          var subscription = {
            channel: key,
            lastUid: _this4._channels[key].lastUid,
            query: _this4._channels[key].query
          };
          subscriptions.push(subscription);
        });
        var _req = {
          sys: plCodes.SYNC,
          subscriptions: subscriptions
        };
        if (_this4._prefs.logReconnection) console.log('SuperScaledSockets', {
          type: 'syncRequest',
          request: _req
        });

        _this4._send(_req);
      };

      this._setStatus(statusCodes.client.DROPPED_RETRYING);

      this._connectHandler(this._prefs.retryAttempts, this._prefs.retryInterval, statusCodes.client.DROPPED_RETRYING, statusCodes.client.RETRY_INTERVAL, statusCodes.client.RECONNECT_FAILED, statusCodes.client.SYNCING, connectSuccess, function (e) {
        _this4.handleError(e);

        if (_this4._onReconnectFail) _this4._onReconnectFail();
      });
    }
  }, {
    key: "_connectHandler",
    value: function _connectHandler(attempts, interval, retryStatus, waitingStatus, failedStatus, successStatus, successCallback, failedCallback) {
      var _this5 = this;

      var attempt = 0;

      var go = function go() {
        if (attempt !== 0) _this5._setStatus(retryStatus);
        attempt++; // will remove the console logs for proper debug logic at some point

        if (_this5._prefs.logReconnection) console.log('SuperScaledSockets', {
          type: 'connectionAttempt',
          reconnectAttempt: attempt
        });

        _this5._makeConnection(function (error, _connection) {
          if (!error) {
            if (_this5._prefs.logReconnection) console.log('SuperScaledSockets', {
              type: 'connectionSuccessful',
              message: 'attempt successful'
            });

            _this5._setStatus(successStatus);

            _this5._connection = _connection;
            successCallback(_connection);
          } else if (attempt === attempts) {
            if (_this5._prefs.logReconnection) console.log('SuperScaledSockets', {
              type: 'connectionFailed',
              message: 'final attempt failed. Unable to establish connection with server'
            });

            _this5._setStatus(failedStatus);

            failedCallback(error);
          } else {
            if (_this5._prefs.logReconnection) console.log('SuperScaledSockets', {
              type: 'connectionAttemptFailed',
              message: "connection attempt ".concat(attempt, " attempt failed. Unable to establish connection with server")
            });

            _this5._setStatus(waitingStatus);

            setTimeout(go, interval);
          }
        });
      };

      go();
    }
  }, {
    key: "_handleStartMessage",
    value: function _handleStartMessage(payload) {
      var _this6 = this;

      switch (payload.sys) {
        case plCodes.BEGIN:
          if (payload.prot.hb) {
            this._hbInterval = payload.prot.hbInterval + (payload.prot.hbThreshold || 1000);

            this._handleHeartbeat();
          }

          if (payload.channel) {
            var userSub = this._createSubscription(payload.channel, null, payload.lastUid);

            this._setStatus(statusCodes.client.READY);

            this._onConnect(null, userSub);
          } else {
            this._setStatus(statusCodes.client.READY);

            this._onConnect(null, null);
          }

          this._msgQueue.forEach(function (_payload) {
            return _this6._handleMessage(_payload);
          });

          this._msgQueue.length = 0;
          break;

        case plCodes.SYNC:
          payload.records.forEach(function (record) {
            _this6._handleFeed(record);
          });

          this._handleSyncComplete(payload.result);

          this._msgQueue.forEach(function (_payload) {
            return _this6._handleMessage(_payload);
          });

          this._msgQueue.length = 0;
          break;

        default:
          this._msgQueue.push(payload);

      }
    }
  }, {
    key: "_handleMessage",
    value: function _handleMessage(payload) {
      var _this7 = this;

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

        case plCodes.UPDATESUB:
          if (this._channels[payload.channel]) {
            this._channels[payload.channel].lastUid = payload.uid;
          }

          break;

        case plCodes.BEGIN:
          if (payload.prot.hb) {
            this._hbInterval = payload.prot.hbInterval + (payload.prot.hbThreshold || 1000);

            this._handleHeartbeat();
          }

          if (payload.channel) {
            var userSub = this._createSubscription(payload.channel, null, payload.lastUid);

            this._setStatus(statusCodes.client.READY);

            this._onConnect(null, userSub);
          } else {
            this._setStatus(statusCodes.client.READY);

            this._onConnect(null, null);
          }

          break;

        case plCodes.SYNC:
          payload.records.forEach(function (record) {
            _this7._handleFeed(record);
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
  }, {
    key: "_handleHeartbeat",
    value: function _handleHeartbeat() {
      var _this8 = this;

      clearTimeout(this._hbTimeout);
      this._hbTimeout = setTimeout(function () {
        _this8._connection.close(4100, 'The socket did not receive a heartbeat');
      }, this._hbInterval);
    }
  }, {
    key: "_makeConnection",
    value: function _makeConnection(callback) {
      var _this9 = this;

      var connection = new WebSocket(this._url); // the on error creates a connection error if the connection is not established

      connection.onerror = function () {
        connection.close(4999, 'ignore'); // ensure connection has closed

        callback(true, null);
      };

      connection.onopen = function () {
        // remove our on startup error function and handle errors normally now we've now connected successfully
        connection.onerror = function (e) {
          _this9._handleError(e);
        };

        connection.onmessage = function (e) {
          if (e.data === 'h') {
            _this9._handleHeartbeat();

            _this9._connection.send('h');

            return;
          }

          var payload = JSON.parse(e.data);

          if (payload.sys) {
            if (_this9._status === statusCodes.client.READY) _this9._handleMessage(payload);else _this9._handleStartMessage(payload);
          }

          if (payload.err) {
            _this9._handleError(payload.err);
          }
        };

        connection.onclose = function (e) {
          if (_this9._hbTimeout) clearTimeout(_this9._hbTimeout);

          switch (e.code) {
            case 4999:
              // Internal Ignore close
              // ignore
              break;

            case 4000:
              // Closed by Client
              _this9._handleClose(statusCodes.client.CLOSED, statusCodes.subscription.CLOSED);

              break;

            case 4001:
              // Booted by Server
              _this9._handleClose(statusCodes.client.BOOTED, statusCodes.subscription.BOOTED);

              if (_this9._onBoot) _this9._onBoot(e.reason);
              break;

            default:
              // Inconsistent client generated code usually 1006 on chrome
              if (_this9._prefs.autoReconnect) {
                _this9._handleClose(statusCodes.client.DROPPED_RETRYING, statusCodes.subscription.DROPPED);

                _this9._handleReconnect();
              } else {
                _this9._handleClose(statusCodes.client.RECONNECT_FAILED, statusCodes.subscription.RECONNECT_FAILED);

                if (_this9.onReconnectFail) _this9._onReconnectFail();
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

  }, {
    key: "connect",
    value: function connect(callback) {
      var _this10 = this;

      this._onConnect = callback;

      this._setStatus(statusCodes.client.STARTING);

      var _attempts = 1;

      if (this._prefs.autoReconnect) {
        _attempts = this._prefs.retryAttempts === 0 ? this._prefs.retryAttempts : 1 + this._prefs.retryAttempts;
      }

      this._connectHandler(_attempts, this._prefs.retryInterval, statusCodes.client.START_RETRYING, statusCodes.client.RETRY_INTERVAL, statusCodes.client.START_FAILED, statusCodes.client.BEGINNING, function () {
        _this10._send({
          sys: plCodes.BEGIN
        });
      }, function (e) {
        _this10.handleError(e);

        if (_this10._onConnect) _this10.onConnect(errors.connectionFailed, null);
      });
    }
    /**
    * Called when the client wishes to close the connection connection with the server.
    * @example
    * client.close() // close connection with the server
    */

  }, {
    key: "close",
    value: function close() {
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

  }, {
    key: "getStatus",
    value: function getStatus() {
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

  }, {
    key: "onTell",
    value: function onTell(topic, callback) {
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

  }, {
    key: "onBroadcast",
    value: function onBroadcast(topic, callback) {
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

  }, {
    key: "onError",
    value: function onError(callback) {
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

  }, {
    key: "onReconnect",
    value: function onReconnect(callback) {
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

  }, {
    key: "onDrop",
    value: function onDrop(callback) {
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

  }, {
    key: "onReconnectFail",
    value: function onReconnectFail(callback) {
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

  }, {
    key: "onBoot",
    value: function onBoot(callback) {
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

  }, {
    key: "onStatusChange",
    value: function onStatusChange(callback) {
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

  }, {
    key: "ask",
    value: function ask(topic, msg, callback) {
      if (this._status === statusCodes.client.READY) {
        // Should add datetimes to all requests and set a time put to check that responses have been received no other way to confirm delivery
        // const _id = this._responseCallbacks.put({cb: callback, time: Date.now()})
        var _id = this._responseCallbacks.put(callback);

        this._send({
          sys: plCodes.ASK,
          topic: topic,
          msg: msg,
          id: _id
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

  }, {
    key: "tell",
    value: function tell(topic, msg, callback) {
      if (this._status === statusCodes.client.READY) {
        this._send({
          sys: plCodes.TELL,
          topic: topic,
          msg: msg
        });

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

  }, {
    key: "subscribe",
    value: function subscribe(channel, query, callback) {
      if (this._status !== statusCodes.client.READY) {
        callback(errors.connectionUnready);
        return;
      }

      if (!/^(?!_)^[a-zA-Z0-9_-]*$/.test(channel) || channel === undefined || channel == null) {
        callback(errors.channelNameNotAllowed);
        return;
      }

      if (this._channels[channel]) {
        var subscription = this._createSubscription(channel);

        callback(null, subscription);
      } else {
        console.log('sending sub request, channel: ', channel);

        var _id = this._responseCallbacks.put(callback);

        this._queryStore[_id] = query;
        var _req = {
          sys: plCodes.SUBSCRIBE,
          channel: channel,
          query: query,
          id: _id
        };

        this._send(_req);
      }
    }
  }]);

  return Client;
}();

var statusText = {
  subscription: {},
  client: {}
};
Object.keys(statusCodes.subscription).forEach(function (key) {
  statusText.subscription[statusCodes.subscription[key]] = key;
});
Object.keys(statusCodes.client).forEach(function (key) {
  statusText.client[statusCodes.client[key]] = key;
});

var client = function client(url, options, callback) {
  var _client = new Client(url, options);

  if (callback) callback(_client);
  return _client;
};
var sss = {
  client: client,
  statusCodes: statusCodes,
  statusText: statusText
};

module.exports = sss;
