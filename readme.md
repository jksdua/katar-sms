Katar SMS
=========

Queue server for sending and receiving SMS.

The library does not do any analysis around whether an SMS is in response to a previous SMS, it simply emits an event when an SMS is received.


Usage
-----

```js
var katarSms = require('./katar-sms');
var smsQueue = katarSms();

// send a new sms
co(function *() {
	return yield smsQueue.send({
		to: '+61404341143',
		msg: 'this is an sms'
	});
})(function(err, id) {
	console.log('sms id: %s', id);
});

// listen for sms sent event
smsQueue.on('sent', function(sms) {
	console.log('Id - %s, To - %s, Msg - %s', sms._id, sms.to, sms.msg);
});
```

Since sms queue extends a katar queue instance, all of the original events are still emitted on the smsQueue.

```js
// emitted if an sms is sent
smsQueue.on('failed', function(task) {
	var sms = task.data;
	console.log('%s: failed to send msg to %s', sms._id, sms.to);
});

// emitted if sending the sms failed
smsQueue.on('done', function(task) {
	var sms = task.data;
	console.log('%s: failed to send msg to %s', sms._id, sms.to);
});
```

### Incoming SMS ###

The sms queue also provides a mechanism for clients to notify when an incoming sms is received.

```js
// add an event handler for processing received sms
smsQueue.on('sms', function(sms) {
	console.log('%s sent msg: %s', sms.from, sms.msg);
});
```


Clients
-------

Clients can be implemented in any language or platform as long as they implement the HTTP API. The HTTP API for SMS queue is the same as a katar HTTP worker. The only addition is a `/receive` route appended to the queue path.

Consider the following sms queue:

```js
var katar = require('katar')();
var queue = katar.queue('sms');
var katarSms = require('katar-sms');
var smsQueue = katarSms({
	katar: katar,
	queue: queue,
	port: 3000,
	ip: '127.0.0.1'
});
```


### Poll for queued sms to be sent

A sample request is shown below. See [Poll for next queued task](https://github.com/jksdua/katar-worker-http#poll-for-next-queued-task) for more details.

__Request:__

```
POST /v1/queue/sms

{}
```

__Response:__

```
{
	tasks: [{ _id: 1, data: { to: '0404123456', msg: 'msg to be sent' }]
}
```


### Mark sms as sent

A sample request is shown below. See [Mark task/tasks as done](https://github.com/jksdua/katar-worker-http#mark-tasktasks-as-done) for more details.

__Request:__

```
POST /v1/queue/sms

{
	tasks: [
		{ _id: 'abc', status: 'done' },
		{ _id: 'def', status: 'failed', error: 'some error' }
	]
}
```

__Response:__

See [Mark task/tasks as done](https://github.com/jksdua/katar-worker-http#mark-tasktasks-as-done).


### Received SMS

To notify the server of SMS received by the worker agent, send a POST request to `/v1/queue/:queue/receive`.

__Request:__

```
POST /v1/queue/sms/receive

{
	sms: { from: '0404123456', msg: 'msg received' }
}
```

__Response:__

The server sends a `204 No Content` status code if there were no errors.