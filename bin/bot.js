#!/usr/bin/env node

'use strict';

/**
 * LinkBot launcher script.
 *
 * @author Andy Mai <hi@andymai.com.com>
 */

var LinkBot = require('../lib/linkbot');

/**
 * Environment variables used to configure the bot:
 *
 *  BOT_API_KEY : the authentication token to allow the bot to connect to your slack organization. You can get your
 *      token at the following url: https://<yourorganization>.slack.com/services/new/bot (Mandatory)
 *  BOT_DB_PATH: the path of the SQLite database used by the bot
 *  BOT_NAME: the username you want to give to the bot within your organisation.
 */
var token = process.env.BOT_API_KEY || require('../token');
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var linkbot = new LinkBot({
	token: token,
	dbPath: dbPath,
	name: name
});

linkbot.run();
