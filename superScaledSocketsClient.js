import statusCodes from './statusCodes';
import client from './client';

const sss = {
  client: client,
  statusCodes: statusCodes,
  statusText: {
    subscription: {},
    client: {}
  }
};
Object.keys(sss.statusCodes.subscription).forEach((key) => {
  sss.statusText.subscription[sss.statusCodes.subscription[key]] = key;
});
Object.keys(sss.statusCodes.client).forEach((key) => {
  sss.statusText.client[sss.statusCodes.client[key]] = key;
});

console.log('statuses', sss.statusCodes);

export default sss;
