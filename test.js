/* jshint node:true */
/* globals describe, beforeEach, it */

'use strict';

var _ = require('lodash');
var co = require('co');
var chai = require('chai');
var should = chai.should();
var request = require('request');

// kick off sms queue
var smsQueue, smsQueueOptions = function() {
	return {
		port: 30000 + parseInt(_.uniqueId(), 10)
	};
};

beforeEach(function(done) {
	smsQueue = require(__dirname)(smsQueueOptions());
	co(function *() {
		yield smsQueue.clear();
	})(done);
});

describe('#options', function() {
	it('should work with default config', function() {
		smsQueue.server.config('sms').should.eql({ interval: 30000 });
	});

	it('should work with custom config', function() {
		smsQueue = require(__dirname)({ pollingInterval: '1m' });
		smsQueue.server.config('sms').should.eql({ interval: 60000 });
	});
});

describe('#send', function() {
	it('should throw an error if an invalid sms is given', function(done) {
		co(function *() {
			yield smsQueue.send('abcd');
		})(function(err) {
			should.exist(err);
			done();
		});
	});

	it('should add an sms in the queue', function(done) {
		var sms = {
			to: '+61 401 234 567',
			msg: 'This is a message!'
		};
		co(function *() {
			yield smsQueue.send(sms);
		})(function(err) {
			should.not.exist(err);
			co(function *() {
				var task = yield smsQueue.findOne();
				task.data.should.eql(sms);
				task.status.should.equal('queued');
				task.priority.should.equal(0);
			})(done);
		});
	});

	it('should add an sms with higher priority', function(done) {
		var sms = {
			to: '+61 401 234 567',
			msg: 'This is a message!'
		};
		co(function *() {
			yield smsQueue.send(sms, 100);
		})(function(err) {
			should.not.exist(err);
			co(function *() {
				var task = yield smsQueue.findOne();
				task.data.should.eql(sms);
				task.status.should.equal('queued');
				task.priority.should.equal(100);
			})(done);
		});
	});
});

describe('#next', function() {
	var sms = {
		to: '+61 401 234 567',
		msg: 'This is a message!'
	};

	beforeEach(function(done) {
		co(function *() {
			yield smsQueue.send(sms, 100);
		})(done);
	});

	it('should return next task to worker if available', function(done) {
		request.post({
			url: 'http://' + smsQueue.opt.host + ':' + smsQueue.opt.port + '/v1/queue/sms',
			json: {}
		}, function(err, res, body) {
			should.not.exist(err);
			res.statusCode.should.equal(200);
			body.tasks[0].data.should.eql(sms);
			done();
		});
	});

	it('should emit sms sent if a current task is marked as done', function(done) {
		var task, asserted = 0;

		// watch for sms sent event, this should be emitted when the task is marked as done
		smsQueue.on('sent', function(s) {
			s.should.eql(sms);
			asserted += 1;
			if (asserted === 3) {	done(); }
		});

		smsQueue.on('done', function(t) {
			t.should.eql(task);
			asserted += 1;
			if (asserted === 3) {	done(); }
		});

		co(function *() {
			task = yield smsQueue.findOne();
		})(function(err) {
			should.not.exist(err);
			request.post({
				url: 'http://' + smsQueue.opt.host + ':' + smsQueue.opt.port + '/v1/queue/sms',
				json: { tasks: [{ _id: task._id, status: 'done' }] }
			}, function(err, res) {
				should.not.exist(err);
				res.statusCode.should.equal(204);
				asserted += 1;
				if (asserted === 3) {	done(); }
			});
		});
	});
});

describe('#receive', function() {
	var sms = {
		from: '+61 401 234 567',
		msg: 'This is a message!'
	};

	it('should emit sms event', function(done) {
		var asserted = 0;

		smsQueue.on('sms', function(s) {
			s.should.eql(sms);
			asserted += 1;
			if (asserted === 2) { done(); }
		});

		request.post({
			url: 'http://' + smsQueue.opt.host + ':' + smsQueue.opt.port + '/v1/queue/sms/receive',
			json: { sms: sms }
		}, function(err, res) {
			should.not.exist(err);
			res.statusCode.should.equal(204);
			asserted += 1;
			if (asserted === 2) { done(); }
		});
	});
});