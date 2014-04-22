/* jshint node:true */

'use strict';

var _ = require('lodash');
var ms = require('ms');
var katar = require('katar');
var assert = require('assert');
var constants = require(__dirname + '/constants');
var jsonschema = require('jsonschema');
var validator = new jsonschema.Validator();
var workerServer = require('katar-worker-http');
var defaultsDeep = _.partialRight(_.merge, _.defaults);

function smsQueue(opt) {
	opt = opt || {};
	defaultsDeep(opt, constants.options.DEFAULT);
	// validate options
	var res = validator.validate(opt, constants.options.SCHEMA);
	assert(res.valid, res.errors);

	var queue = opt.queue;

	// start http worker
	var server = workerServer({
		katar: opt.katar,
		port: opt.port,
		host: opt.host
	});

	// push custom config to workers
	server.config(opt.queue, {
		interval: ms(opt.pollingInterval)
	});

	// add additional routes required by the sms queue system
	incomingSms(queue, server);

	// listen for task done event
	queue.on(katar.constants.task.status.DONE, function(task) {
		queue.emit(constants.event.SMS_SENT, task.data);
	});

	console.log('SMS Queue');
	console.log('Poll for sms tasks on /v1%s', getPath(queue, constants.path.OUTGOING));
	console.log('Send incoming sms to /v1%s', getPath(queue, constants.path.INCOMING));

	return Object.create(queue, {
		opt: { value: opt },
		send: { value: send },
		server: { value: server }
	});
}

/**
	Send an SMS
		- Adds a message to the queue
		- SMS are then processed by the workers

	@param {Object} sms SMS to send
		@param {String} sms.to Who to send the message to
		@param {String} sms.msg Message to send

	@param {Number} priority Priority of the message. priority can be set by using katar.constants.task.priority.<HIGH|MEDIUM|LOW>
 */
var smsArgSchema = {
	type: 'object',
	required: true,
	properties: {
		to: { type: 'string', format: 'phone', required: true },
		msg: { type: 'string', required: true }
	}
};
function *send(sms, priority) {
	var res = validator.validate(sms, smsArgSchema);
	assert(res.valid, 'Invalid sms. Reason: %j', res.errors);

	yield this.insert({ data: sms, priority: priority });
};

/**
	Get path for queue
 */
function getPath(queue, path) {
	return '/queue/' + queue.name + path;
}

function incomingSms(queue, server) {
	server.router.post(getPath(queue, constants.path.INCOMING), function *() {
		queue.emit(constants.event.SMS_RECEIVED, this.request.body.sms);
		this.status = 204;
	}, {
		parse: 'json',
		schema:{
			body: {
				sms: {
					type: 'object',
					required: true,
					properties: {
						from: { type: 'string', format: 'phone', required: true },
						msg: { type: 'string', required: true }
					}
				}
			}
		}
	});
}

module.exports = smsQueue;