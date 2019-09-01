(function(a,b){"object"==typeof exports&&"undefined"!=typeof module?module.exports=b():"function"==typeof define&&define.amd?define(b):(a=a||self,a["super-scaled-sockets-client"]=b())})(this,function(){'use strict';function a(a,b){if(!(a instanceof b))throw new TypeError("Cannot call a class as a function")}function b(a,b){for(var c,d=0;d<b.length;d++)c=b[d],c.enumerable=c.enumerable||!1,c.configurable=!0,"value"in c&&(c.writable=!0),Object.defineProperty(a,c.key,c)}function c(a,c,d){return c&&b(a.prototype,c),d&&b(a,d),a}function d(a,b,c){return b in a?Object.defineProperty(a,b,{value:c,enumerable:!0,configurable:!0,writable:!0}):a[b]=c,a}function e(a,b){var c=Object.keys(a);if(Object.getOwnPropertySymbols){var d=Object.getOwnPropertySymbols(a);b&&(d=d.filter(function(b){return Object.getOwnPropertyDescriptor(a,b).enumerable})),c.push.apply(c,d)}return c}function f(a){for(var b,c=1;c<arguments.length;c++)b=null==arguments[c]?{}:arguments[c],c%2?e(b,!0).forEach(function(c){d(a,c,b[c])}):Object.getOwnPropertyDescriptors?Object.defineProperties(a,Object.getOwnPropertyDescriptors(b)):e(b).forEach(function(c){Object.defineProperty(a,c,Object.getOwnPropertyDescriptor(b,c))});return a}var g={client:{INIT:0,STARTING:1,START_RETRYING:2,DROPPED_RETRYING:3,START_FAILED:4,RETRY_INTERVAL:5,RECONNECT_FAILED:6,READY:7,SYNCING:8,BEGINNING:9,BOOTED:10,CLOSED:11},subscription:{ACTIVE:1,DROPPED:2,SYNCING:3,SYNC_FAILED:4,UNSUBSCRIBED:5,BOOTED:6,CLOSED:7,RECONNECT_FAILED:8}},h=function(){this._stash={},this._id=1,this.put=function(a){return this._stash[this._id]=a,this._id++},this.take=function(a){var b=this._stash[a];return this._stash[a]&&delete this._stash[a],0===Object.keys(this._stash).length&&(this._id=1),b},this.see=function(a){return this._stash[a]},this.clear=function(){this._stash={},this._id=1},this.iterate=function(a){var b=this;Object.keys(this._stash).forEach(function(c){a(b._stash[c],c)})},this.isEmpty=function(){return 0===Object.keys(this._stash).length},this.replace=function(a,b){this._stash[a]=b},this.size=function(){return Object.keys(this._stash).length}},i={SUBSCRIBE:1,UNSUBSCRIBE:2,BEGIN:3,SYNC:4,ASK:5,TELL:6,RESPONSE:7,FEED:8,BOOT:9,BOOTCHANNEL:10,BROADCAST:11,UPDATESUB:12},j=function(){function b(c,d,e){a(this,b),this._client=c,this._status=g.subscription.ACTIVE,this._id=e,this._channel=d,this._onError=null,this._onStatusChange=null,this._listeners={}}return c(b,[{key:"_handleFeed",value:function(a,b,c){this._listeners[a]&&this._listeners[a](b,c)}},{key:"_setStatus",value:function(a){if(this._onStatusChange){var b=this._status;this._status=a,this._onStatusChange(a,b)}else this._status=a}},{key:"_handleError",value:function(a,b){this._onError&&this._onError(a),b&&this._setStatus(b)}},{key:"on",value:function(a,b){this._listeners[a]=b}},{key:"unsubscribe",value:function(){this._client._removeSubscription(this._channel,this._id)}},{key:"getStatus",value:function(){return this._status}},{key:"onStatusChange",value:function(a){this._onStatusChange=a}},{key:"onError",value:function(a){this._onError=a}}]),b}(),k={unknownSys:{name:"Unknown payload type",message:"Unknown payload type received from the server"},resIdNoMatch:{name:"Received response with an unknown message ID",message:"Unexpected Error: Response Id not in Id array"},unknownSubscription:{name:"Received message for unsubscribed channel",message:"Unknown channel on sub message sent from server"},connectionDropped:{name:"Connection dropped",message:"The connection dropped, unable to send message"},connectionUnready:{name:"Connection not ready",message:"The connection not ready, unable to send message"},channelSync:{name:"Unable to sync",message:"Unable to sync the channel"},unknownChannel:{name:"Unknown channel",message:"Received payload for unknown channel"},subMissing:{name:"Cannot Locate Subscription",message:"During unsubscribe process unable to locate subscription in subs stash"},channelMissing:{name:"Cannot locate channel",message:"During unsubscribe process unable to locate channel in channel object"},connectionFailed:{name:"Unable to connect to the server",message:"Unable to establish a connection with the WebSockets Error"},channelNameNotAllowed:{name:"Channel name not allowed",message:"Must be \"A-Z 0-9 - _\" with no spaces and no leading underscores"}},l={logReconnection:!1,retryAttempts:0,retryInterval:5e3,autoReconnect:!0},m=function(a){var b=f({},l);return Object.keys(a).forEach(function(c){void 0===b[c]?console.log("SuperScaledSockets","Unknown preference name '".concat(c,"' passed to server")):b[c]=a[c]}),1e3>b.retryInterval&&(b.retryInterval=1e3),b},n=function(){function b(c,d){a(this,b),this._url=c,this._prefs=m(d),this._status=g.client.INIT,this._connection=null,this._tellListeners={},this._broadcastListeners={},this._onConnect=null,this._onError=null,this._onReconnect=null,this._onDrop=null,this._onBoot=null,this._onReconnectFail=null,this._onStatusChange=null,this._channels={},this._responseCallbacks=new h,this._queryStore={},this._hbTimeout=null,this._hbInterval=31e3,this._msgQueue=[]}return c(b,[{key:"_send",value:function(a){this._connection.send(JSON.stringify(a))}},{key:"_createSubscription",value:function(a,b,c){this._channels[a]||(this._channels[a]={query:b,subscriptions:new h,lastUid:c});var d=this._channels[a].subscriptions.put(0),e=new j(this,a,d);return this._channels[a].subscriptions.replace(d,e),e}},{key:"_removeSubscription",value:function(a,b){if(!this._channels[a])return void this._handleError(k.channelMissing,{channel:a,channels:this._channels});var c=this._channels[a].subscriptions.take(b);return c?void(this._channels[a].subscriptions.isEmpty()&&this._removeChannel(a)):void this._handleError(k.subMissing,{id:b,subs:this._channels[a].subscriptions})}},{key:"_removeChannel",value:function(a){this._channels[a]&&delete this._channels[a],this._status===g.client.READY&&this._send({sys:i.UNSUBSCRIBE,channel:a})}},{key:"_handleClose",value:function(a,b){var c=this;this._connection.close(),this._connection=null,this._setStatus(a),this._responseCallbacks.iterate(function(a){a(k.connectionDropped,null)}),this._responseCallbacks.clear(),Object.keys(this._channels).forEach(function(a){c._channels[a].subscriptions.iterate(function(a){a._setStatus(b)})}),this._onDrop&&this._onDrop()}},{key:"_handleBroadcast",value:function(a){this._broadcastListeners[a.topic]&&this._broadcastListeners[a.topic](a.msg)}},{key:"_handleSyncStart",value:function(){var a=this;Object.keys(this._channels).forEach(function(b){a._channels[b].subscriptions.iterate(function(a){a._setStatus(g.subscription.SYNCING)})})}},{key:"_handleSyncComplete",value:function(a){var b=this;this._setStatus(g.client.READY),Object.keys(this._channels).forEach(function(c){a[c]?b._channels[c].subscriptions.iterate(function(a){a._setStatus(g.subscription.ACTIVE)}):b._channels[c].subscriptions.iterate(function(a){a._handleError(k.channelSync,g.subscription.SYNC_FAILED)})}),this._onReconnect&&this._onReconnect()}},{key:"_handleSubscribe",value:function(a){var b=this._responseCallbacks.take(a.id);if(!b)return void this._handleError(k.resIdNoMatch);if(a.result&&!a.err){var c=this._createSubscription(a.channel,this._queryStore[a.id],a.lastUid);return delete this._queryStore[a.id],void b(a.err,a.result,c)}b(a.err,a.result)}},{key:"_handleResponse",value:function(a){var b=this._responseCallbacks.take(a.id);b?b(a.err,a.msg):this._handleError(k.resIdNoMatch)}},{key:"_handleFeed",value:function(a){this._channels[a.channel]?(this._channels[a.channel].lastUid=a.uid,this._channels[a.channel].subscriptions.iterate(function(b){b._handleFeed(a.topic,a.msg,a.uid)})):this._handleError(k.unknownChannel)}},{key:"_handleTell",value:function(a){this._tellListeners[a.topic]&&this._tellListeners[a.topic](a.msg)}},{key:"_setStatus",value:function(a){if(a!==this._status)if(this._onStatusChange){var b=this._status;this._status=a,this._onStatusChange(a,b)}else this._status=a}},{key:"_handleError",value:function(a,b,c){console.error("SuperScaledSockets",a,{errorDetails:b||"none"}),this._onError&&a&&this._onError(a),c&&this._setStatus(c)}},{key:"_handleReconnect",value:function(){var a=this;this._setStatus(g.client.DROPPED_RETRYING),this._connectHandler(this._prefs.retryAttempts,this._prefs.retryInterval,g.client.DROPPED_RETRYING,g.client.RETRY_INTERVAL,g.client.RECONNECT_FAILED,g.client.SYNCING,function(){a._handleSyncStart();var b=[];Object.keys(a._channels).forEach(function(c){var d={channel:c,lastUid:a._channels[c].lastUid,query:a._channels[c].query};b.push(d)});var c={sys:i.SYNC,subscriptions:b};a._prefs.logReconnection&&console.log("SuperScaledSockets",{type:"syncRequest",request:c}),a._send(c)},function(b){a.handleError(b),a._onReconnectFail&&a._onReconnectFail()})}},{key:"_connectHandler",value:function(a,b,c,d,e,f,g,h){var i=this,j=0,k=function k(){0!==j&&i._setStatus(c),j++,i._prefs.logReconnection&&console.log("SuperScaledSockets",{type:"connectionAttempt",reconnectAttempt:j}),i._makeConnection(function(c,l){c?j===a?(i._prefs.logReconnection&&console.log("SuperScaledSockets",{type:"connectionFailed",message:"final attempt failed. Unable to establish connection with server"}),i._setStatus(e),h(c)):(i._prefs.logReconnection&&console.log("SuperScaledSockets",{type:"connectionAttemptFailed",message:"connection attempt ".concat(j," attempt failed. Unable to establish connection with server")}),i._setStatus(d),setTimeout(k,b)):(i._prefs.logReconnection&&console.log("SuperScaledSockets",{type:"connectionSuccessful",message:"attempt successful"}),i._setStatus(f),i._connection=l,g(l))})};k()}},{key:"_handleStartMessage",value:function(a){var b=this;switch(a.sys){case i.BEGIN:if(a.prot.hb&&(this._hbInterval=a.prot.hbInterval+(a.prot.hbThreshold||1e3),this._handleHeartbeat()),a.channel){var c=this._createSubscription(a.channel,null,a.lastUid);this._setStatus(g.client.READY),this._onConnect(null,c)}else this._setStatus(g.client.READY),this._onConnect(null,null);this._msgQueue.forEach(function(a){return b._handleMessage(a)}),this._msgQueue.length=0;break;case i.SYNC:a.records.forEach(function(a){b._handleFeed(a)}),this._handleSyncComplete(a.result),this._msgQueue.forEach(function(a){return b._handleMessage(a)}),this._msgQueue.length=0;break;default:this._msgQueue.push(a);}}},{key:"_handleMessage",value:function(a){var b=this;switch(a.sys){case i.FEED:this._handleFeed(a);break;case i.RESPONSE:this._handleResponse(a);break;case i.TELL:this._handleTell(a);break;case i.SUBSCRIBE:this._handleSubscribe(a);break;case i.UPDATESUB:this._channels[a.channel]&&(this._channels[a.channel].lastUid=a.uid);break;case i.BEGIN:if(a.prot.hb&&(this._hbInterval=a.prot.hbInterval+(a.prot.hbThreshold||1e3),this._handleHeartbeat()),a.channel){var c=this._createSubscription(a.channel,null,a.lastUid);this._setStatus(g.client.READY),this._onConnect(null,c)}else this._setStatus(g.client.READY),this._onConnect(null,null);break;case i.SYNC:a.records.forEach(function(a){b._handleFeed(a)}),this._handleSyncComplete(a.result);break;case i.BROADCAST:this._handleBroadcast(a);break;case i.BOOT:this._connection.close(4001,a.reason);break;default:this._handleError(k.unknownSys);}}},{key:"_handleHeartbeat",value:function(){var a=this;clearTimeout(this._hbTimeout),this._hbTimeout=setTimeout(function(){a._connection.close(4100,"The socket did not receive a heartbeat")},this._hbInterval)}},{key:"_makeConnection",value:function(a){var b=this,c=new WebSocket(this._url);c.onerror=function(){c.close(4999,"ignore"),a(!0,null)},c.onopen=function(){c.onerror=function(a){b._handleError(a)},c.onmessage=function(a){if("h"===a.data)return b._handleHeartbeat(),void b._connection.send("h");var c=JSON.parse(a.data);c.sys&&(b._status===g.client.READY?b._handleMessage(c):b._handleStartMessage(c)),c.err&&b._handleError(c.err)},c.onclose=function(a){switch(b._hbTimeout&&clearTimeout(b._hbTimeout),a.code){case 4999:break;case 4e3:b._handleClose(g.client.CLOSED,g.subscription.CLOSED);break;case 4001:b._handleClose(g.client.BOOTED,g.subscription.BOOTED),b._onBoot&&b._onBoot(a.reason);break;default:b._prefs.autoReconnect?(b._handleClose(g.client.DROPPED_RETRYING,g.subscription.DROPPED),b._handleReconnect()):(b._handleClose(g.client.RECONNECT_FAILED,g.subscription.RECONNECT_FAILED),b.onReconnectFail&&b._onReconnectFail());}},a(null,c)}}},{key:"connect",value:function(a){var b=this;this._onConnect=a,this._setStatus(g.client.STARTING);var c=1;this._prefs.autoReconnect&&(c=0===this._prefs.retryAttempts?this._prefs.retryAttempts:1+this._prefs.retryAttempts),this._connectHandler(c,this._prefs.retryInterval,g.client.START_RETRYING,g.client.RETRY_INTERVAL,g.client.START_FAILED,g.client.BEGINNING,function(){b._send({sys:i.BEGIN})},function(a){b.handleError(a),b._onConnect&&b.onConnect(k.connectionFailed,null)})}},{key:"close",value:function(){this._connection.close(4e3,"Connection closed by client")}},{key:"getStatus",value:function(){return this._status}},{key:"onTell",value:function(a,b){this._tellListeners[a]=b}},{key:"onBroadcast",value:function(a,b){this._broadcastListeners[a]=b}},{key:"onError",value:function(a){this._onError=a}},{key:"onReconnect",value:function(a){this._onReconnect=a}},{key:"onDrop",value:function(a){this._onDrop=a}},{key:"onReconnectFail",value:function(a){this._onReconnectFail=a}},{key:"onBoot",value:function(a){this._onBoot=a}},{key:"onStatusChange",value:function(a){this._onStatusChange=a}},{key:"ask",value:function(a,b,c){if(this._status===g.client.READY){var d=this._responseCallbacks.put(c);this._send({sys:i.ASK,topic:a,msg:b,id:d})}else c(k.connectionUnready)}},{key:"tell",value:function(a,b,c){this._status===g.client.READY?(this._send({sys:i.TELL,topic:a,msg:b}),c&&c(null)):c&&c(k.connectionUnready)}},{key:"subscribe",value:function(a,b,c){if(this._status!==g.client.READY)return void c(k.connectionUnready);if(!/^(?!_)^[a-zA-Z0-9_-]*$/.test(a)||void 0===a||null==a)return void c(k.channelNameNotAllowed);if(this._channels[a]){var d=this._createSubscription(a);c(null,d)}else{console.log("sending sub request, channel: ",a);var e=this._responseCallbacks.put(c);this._queryStore[e]=b;var f={sys:i.SUBSCRIBE,channel:a,query:b,id:e};this._send(f)}}}]),b}(),o={subscription:{},client:{}};Object.keys(g.subscription).forEach(function(a){o.subscription[g.subscription[a]]=a}),Object.keys(g.client).forEach(function(a){o.client[g.client[a]]=a});return{client:function(a,b,c){var d=new n(a,b);return c&&c(d),d},statusCodes:g,statusText:o}});