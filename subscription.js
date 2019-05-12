import statusCodes from './statusCodes';

export default (client, channel, id) => ({
  status: statusCodes.subscription.ACTIVE,
  _id: id,
  _channel: channel,
  _onError: null,
  _onStatusChange: null,
  _listeners: {},
  _handleFeed: function _handleFeed(topic, msg) {
    if (this._listeners[topic]) {
      this._listeners[topic](msg);
    }
  },
  _setStatus: function _setStatus(status) {
    if (this._onStatusChange) {
      const oldStatus = this._status;
      this._status = status;
      this._onStatusChange(status, oldStatus);
    } else this._status = status;
  },
  _handleError: function _handleError(error, status) {
    if (this._onError) this._onError(error);
    if (status) this._setStatus(status);
  },
  on: function on(topic, callback) {
    this._listeners[topic] = callback;
  },
  unsubscribe: function unsubscribe() {
    client._removeSubscription(this._channel, this._id);
  },
  getStatus: function getStatus() {
    return this._status;
  },
  onStatusChange: function onStatusChange(callback) {
    this._onStatusChange = callback;
  },
  onError: function onError(callback) {
    this._onError = callback;
  }
});
