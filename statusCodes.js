const statusCodes = {};
statusCodes.client = {
  INIT: 0,
  STARTING: 1,
  START_RETRYING: 2,
  DROPPED_RETRYING: 3,
  START_FAILED: 4,
  RETRY_INTERVAL: 5,
  RECONNECT_FAILED: 6,
  READY: 7,
  SYNCING: 8,
  BEGINNING: 9
};

statusCodes.subscription = {
  ACTIVE: 1,
  DROPPED: 2,
  SYNCING: 3,
  SYNC_FAILED: 4
};

export default statusCodes;
