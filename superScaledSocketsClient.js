import statusCodes from './statusCodes';
import client from './client';

const sss = {};

sss.client = client;
sss.statusCodes = {
  client: statusCodes.client,
  subscription: statusCodes.subscription
};
sss.statusCodes.subscriptionText = {};
Object.keys(sss.statusCodes.subscription).forEach((key) => {
  sss.statusCodes.subscriptionText[sss.statusCodes.subscription[key]] = key;
});
sss.statusCodes.clientText = {};
Object.keys(sss.statusCodes.client).forEach((key) => {
  sss.statusCodes.clientText[sss.statusCodes.client[key]] = key;
});

export default sss;
