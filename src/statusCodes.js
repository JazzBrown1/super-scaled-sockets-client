const statusCodes = {
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

export default statusCodes;
