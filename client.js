import util from './util';
import statusCodes from './statusCodes';
import plCodes from './plCodes';
import subscription__ from './subscription';

const errors = {
  unknownSys: { name: 'Unknown payload type', message: 'Unknown payload type recieved from the server' },
  resIdNoMatch: { name: 'Recieved response with an unknown message ID', message: 'Unexpected Error: Response Id not in Id array' },
  unknownSubscription: { name: 'Recieved message for unsubscribed channel', message: 'Unknown channel on sub message sent from server' },
  connectionDropped: { name: 'Connection droped', message: 'The connection dropped, unable to send message' },
  connectionUnready: { name: 'Connection not ready', message: 'The connection not ready, unable to send message' },
  channelSync: { name: 'Unable to sync', message: 'Unable to sync the channel' },
  unknownChannel: { name: 'Uknown channel', message: 'Recieved payload for unknown channel' },
  subMissing: { name: 'Cannot Locate Subscription', message: 'During unsubscribe process unable to locate subscription in subs stash' },
  channelMissing: { name: 'Cannot locate channel', message: 'During unsubscribe process unable to locate channel in channel object' },
  connectionFailed: { name: 'Unable to connect to the server', message: 'Unable to establish a connection with the WebSockets Error' }
};

const client = (url, prefs, callback__) => {
  const obj = {
    _url: url,
    _prefs: prefs || {},
    _status: statusCodes.client.INIT,
    _connection: null,
    _listeners: {},
    _onConnect: null,
    _onError: null,
    _onReconnect: null,
    _onDrop: null,
    _onConnectFailed: null,
    _onReconnectFail: null,
    _onStatusChange: null,
    _onFail: null,
    _channels: {},
    _responseCbs: new util.Stash(),
    _queryStore: {},
    _send: function _send(payload) {
      this._connection.send(JSON.stringify(payload));
      if (this._prefs.logPayload) console.log('SuperScaledSockets', { type: 'clientPayload', payload: payload });
    },
    _createSubscription: function _createSubscription(channel, query, lastUid) {
      if (!this._channels[channel]) {
        this._channels[channel] = { query: query, subscriptions: new util.Stash(), lastUid: lastUid };
      }
      const id = this._channels[channel].subscriptions.put(0);
      const _subscription = subscription__(this, channel, id);
      this._channels[channel].subscriptions.replace(id, _subscription);
      return _subscription;
    },
    _removeSubscription: function _removeSubscription(channel, id) {
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
    },
    _removeChannel: function _removeChannel(channel) {
      if (this._channels[channel]) delete this._channels[channel];
      this._send({ sys: plCodes.UNSUBSCRIBE, channel: channel });
    },
    _handleDrop: function _handleDrop() {
      this._connection = null;
      this._setStatus(statusCodes.client.DROPPED_RETRYING);
      this._responseCbs.iterate((cb) => {
        cb(errors.connectionDropped, null);
      });
      this._responseCbs.clear();
      Object.keys(this._channels).forEach((key) => {
        this._channels[key].subscriptions.iterate((subscription) => {
          subscription._setStatus(statusCodes.subscription.DROPPED);
        });
      });
      if (this._onDrop) this._onDrop();
    },
    _handleSyncing: function _handleSyncing() {
      Object.keys(this._channels).forEach((key) => {
        this._channels[key].subscriptions.iterate((subscription) => {
          subscription._setStatus(statusCodes.subscription.SYNCING);
        });
      });
    },
    _handleSynced: function _handleSynced(results) {
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
    },
    _handleSubscribe: function _handleSubscribe(payload) {
      const subCb = this._responseCbs.take(payload.id);
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
    },
    _handleResponse: function _handleResponse(payload) {
      const resCb = this._responseCbs.take(payload.id);
      if (!resCb) {
        this._handleError(errors.resIdNoMatch);
      } else {
        resCb(payload.err, payload.msg);
      }
    },
    _handleFeed: function _handleFeed(payload) {
      if (this._channels[payload.channel]) {
        this._channels[payload.channel].lastUid = payload.uid;
        this._channels[payload.channel].subscriptions.iterate((subscription) => {
          subscription._handleFeed(payload.topic, payload.msg);
        });
      } else {
        this._handleError(errors.unknownChannel);
      }
    },
    _handleTell: function _handleTell(payload) {
      if (this._listeners[payload.topic]) {
        this._listeners[payload.topic](payload.msg);
      }
    },
    _setStatus: function _setStatus(status) {
      if (status !== this._status) {
        if (this._onStatusChange) {
          const oldStatus = this._status;
          this._status = status;
          this._onStatusChange(status, oldStatus);
        } else this._status = status;
      }
    },
    _handleError: function _handleError(error, details, status) {
      console.error('SuperScaledSockets', error, { errorDetails: details || 'none' });
      if (this._onError && error) this._onError(error);
      if (status) this._setStatus(status);
    },
    _handleOnClose: function _handleOnClose() {
      this._handleDrop();
      const handleReconnect = () => {
        this._handleSyncing();
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
      this._connectHandler(
        this._prefs.retryAttempts || 0,
        this._prefs.retryInterval || 5000,
        statusCodes.client.DROPPED_RETRYING,
        statusCodes.client.RECONNECT_FAILED,
        statusCodes.client.SYNCING,
        handleReconnect,
        (e) => {
          this.handleError(e);
          if (this._onReconnectFail) this._onReconnectFail();
        }
      );
    },
    _connectHandler: function _connectHandler(retrys, interval, retryStatus, failedStatus, successStatus, successCallback, failedCallback) {
      this._makeConnection((err, connection) => {
        if (!err) {
          this._setStatus(successStatus);
          this._connection = connection;
          successCallback(connection);
        } else {
          this._setStatus(retryStatus);
          let attempts = 0;
          const retryInterval = setInterval(() => {
            attempts++;
            // will remove the conole logs for propper debug logic at some point
            if (this._prefs.logReconnection) console.log('SuperScaledSockets', { type: 'reconnectionAttempt', reconnectAttempt: attempts });
            this._makeConnection((error, _connection) => {
              if (!error) {
                if (this._prefs.logReconnection) console.log('SuperScaledSockets', { type: 'reconnectionSuccessful', message: 'attempt successful' });
                this._setStatus(successStatus);
                this._connection = _connection;
                clearInterval(retryInterval);
                successCallback(_connection);
              } else if (attempts === retrys) {
                if (this._prefs.logReconnection) console.log('SuperScaledSockets', { type: 'connectionFailed', message: 'final attempt failed. Unable to esablish connection with server' });
                this._setStatus(failedStatus);
                clearInterval(retryInterval);
                failedCallback(error);
              } else if (this._prefs.logReconnection) console.log('SuperScaledSockets', { type: 'connectionAttemptFailed', message: `connection attempt ${attempts} attempt failed. Unable to esablish connection with server` });
            });
          }, interval);
        }
      });
    },
    _makeConnection: function _makeConnection(callback) {
      const connection = new WebSocket(this._url);
      // the on error creates a connection error if the connection is not established
      connection.onerror = () => {
        callback({ name: 'Start up connection Error', message: 'Error connectiong to websocket server' });
      };
      connection.onopen = () => {
        // remove our on startup error function and handle errors normally now we've now connected successfully
        connection.onerror = (e) => {
          this._handleError(e);
        };
        connection.onmessage = (e) => {
          const payload = JSON.parse(e.data);
          if (this._prefs.logPayload) console.log('SuperScaledSockets', { type: 'serverPayload', payload: payload });
          if (payload.sys) {
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
                if (payload.channel) {
                  const userSub = this._createSubscription(payload.channel, null, payload.lastUid);
                  this._setStatus(statusCodes.client.READY);
                  if (this._onConnect) this._onConnect(null, userSub);
                } else {
                  this._setStatus(statusCodes.client.READY);
                  if (this._onConnect) this._onConnect(null, null);
                }
                break;
              case plCodes.SYNC:
                payload.records.forEach((record) => {
                  this._handleFeed(record);
                });
                this._handleSynced(payload.result);
                break;
              default:
                this._handleError(errors.unknownSys);
            }
          }
          if (payload.err) {
            this._handleError(payload.err);
          }
        };
        connection.onclose = () => {
          if (connection.readyState === WebSocket.OPEN) {
            connection.close();
          }
          this._handleOnClose();
        };
        callback(null, connection);
      };
    },
    connect: function connect(callback) {
      this._onConnect = callback;
      this._setStatus(statusCodes.client.STARTING);
      this._connectHandler(
        this._prefs.retryAttempts || 0,
        this._prefs.retryInterval || 5000,
        statusCodes.client.START_RETRYING,
        statusCodes.client.START_FAILED,
        statusCodes.client.BEGINING,
        () => {
          this._send({ sys: plCodes.BEGIN });
        },
        (e) => {
          this.handleError(e);
          if (this._onFail) this._onFail();
          if (this._onConnect) this.onConnect(errors.connectionFailed, null);
        }
      );
    },
    getStatus: function getStatus() {
      return this._status;
    },
    onTell: function on(topic, callback) {
      this._listeners[topic] = callback;
    },
    onConnect: function onConnect(callback) {
      this._onConnect = callback;
      if (this._status === statusCodes.client.READY) callback(this);
    },
    onError: function onError(callback) {
      this._onError = callback;
    },
    onReconnect: function onReconnect(callback) {
      this._onReconnect = callback;
    },
    onDrop: function onDrop(callback) {
      this._onDrop = callback;
    },
    onFail: function onFail(callback) {
      this._onFail = callback;
      if (this._status === statusCodes.client.START_FAILED) callback();
    },
    onReconnectFail: function onFail(callback) {
      this._onReconnectFail = callback;
    },
    onStatusChange: function onStatusChange(callback) {
      this._onStatusChange = callback;
    },
    ask: function ask(topic, msg, callback) {
      if (this._status === statusCodes.client.READY) {
        const _id = this._responseCbs.put(callback);
        this._send({
          sys: plCodes.ASK, topic: topic, msg: msg, id: _id
        });
      } else {
        callback(errors.connectionUnready);
      }
    },
    tell: function tell(topic, msg, callback) {
      if (this._status === statusCodes.client.READY) {
        this._send({ sys: plCodes.TELL, topic: topic, msg: msg });
        if (callback) callback(null);
      } else if (callback) callback(errors.connectionUnready);
    },
    // to be deprecated
    send: function send(topic, msg, callback) {
      console.log('SuperScaledSockets', 'client.send is to be deprecated, use client.ask or client.tell instead');
      if (callback) {
        this.ask(topic, msg, callback);
      } else {
        this.tell(topic, msg);
      }
    },
    // to be deprecated
    emit: function emit(t, m, c) {
      console.log('SuperScaledSockets', 'client.emit is to be deprecated, use client.ask or client.tell instead');
      this.send(t, m, c);
    },
    subscribe: function subscribe(channel, query, callback) {
      if (this._status === statusCodes.client.READY) {
        if (this._channels[channel]) {
          const subscription = this._createSubscription(channel);
          callback(null, subscription);
        } else {
          const _id = this._responseCbs.put(callback);
          this._queryStore[_id] = query;
          const _req = {
            sys: plCodes.SUBSCRIBE, channel: channel, query: query, id: _id
          };
          this._send(_req);
        }
      } else {
        callback(errors.connectionUnready);
      }
    }
  };
  if (callback__) callback__(obj);
  return obj;
};

export default client;
