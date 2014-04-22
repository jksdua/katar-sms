/* jshint node:true */

'use strict';

var katar = require('katar')();

exports.event = Object.create(null, {
	SMS_SENT: { value: 'sent' },
	SMS_RECEIVED: { value: 'sms' }
});

exports.path = Object.create(null, {
	OUTGOING: { value: '' },
	INCOMING: { value: '/receive' }
});

exports.options = Object.create(null, {
	DEFAULT: {
		value: {
			katar: katar,
			queue: katar.queue('sms', null),
			host: '127.0.0.1',
			port: 3000,
			pollingInterval: '30s'
		}
	},
	SCHEMA: {
		value: {
			type: 'object',
			required: true,
			properties: {
				katar: {
					type: 'object',
					required: true
				},
				queue: {
					type: 'object',
					required: true
				},
				host: {
					type: 'string',
					required: true,
					oneOf: [
						{ format: 'host-name' },
						{ format: 'ipv4' },
						{ format: 'ipv6' }
					]
				},
				port: {
					type: 'integer',
					required: true,
					minimum: 1,
					maximum: 65535
				},
				pollingInterval: {
					// either a string understood by ms or integer in milliseconds
					type: ['string', 'number'],
					required: true
				}
			}
		}
	}
});