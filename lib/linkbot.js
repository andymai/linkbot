'use strict';

var async = require('async');
var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');
var Q = require('q');
var weather = require('weather-js');

/**
 * Constructor function. It accepts a settings object which should contain the following keys:
 *      token : the API token of the bot (mandatory)
 *      name : the name of the bot (will default to "LinkBot")
 *      dbPath : the path to access the database (will default to "data/linkbot.db")
 *
 * @param {object} settings
 * @constructor
 *
 * @author Andy Mai <hi@andymai.com>
 */
var LinkBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'LinkBot';
    this.dbPath = settings.dbPath || path.resolve(__dirname, '..', 'data', 'linkbot.db');

    this.user = null;
    this.db = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(LinkBot, Bot);

/**
 * Run the bot
 * @public
 */
 LinkBot.prototype.run = function () {
    LinkBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

/**
 * On Start callback, called when the bot connects to the Slack server and access the channel
 * @private
 */
 LinkBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

/**
 * On message callback, called when a message (of any type) is detected with the real time messaging API
 * @param {object} message
 * @private
 */
 LinkBot.prototype._onMessage = function (message) {
    if (this._isChatMessage(message) &&
        this._isDotCommand(message)
    ) {
        console.log("=== Command Detected ===");
        this._parseBuffer(message);
    }
};

/**
 * Loads the user object representing the bot
 * @private
 */
 LinkBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

/**
 * Open connection to the db
 * @private
 */
 LinkBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

/**
 * Check if the first time the bot is run. It's used to send a welcome message into the channel
 * @private
 */
 LinkBot.prototype._firstRunCheck = function () {
    console.log("=== First Run Check ===");
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

/**
 * Sends a welcome message in the channel
 * @private
 */
 LinkBot.prototype._welcomeMessage = function () {
    console.log("=== Sending Welcome Message ===");
    this.postMessageToChannel(this.channels[0].name, 'Hi, I\'m a linkbot! Usage: .bookmark <keyword> <data>',
        {as_user: true});
};

/**
 * Util function to check if a given real time message object represents a chat message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
 LinkBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

/**
 * Util function to check if a given real time message object is directed to a channel
 * @param {object} message
 * @returns {boolean}
 * @private
 */
 LinkBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C'
        ;
};

/**
 * Util function to check if a given real time message has ben sent by LinkBot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
LinkBot.prototype._isFromLinkBot = function (message) {
    return message.user === this.user.id;
};

/**
 * Util function to get the name of a channel given its id
 * @param {string} channelId
 * @returns {Object}
 * @private
 */
LinkBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

/**
 * Util function to check if a given real time message object starts with a period
 * @param {object} message
 * @returns {boolean}
 * @private
 */
 LinkBot.prototype._isDotCommand = function (message) {
    var arg = message.text;
    return arg.indexOf('.') === 0;
};

/**
 * Parses commands from incoming messages
 * @param {object} message
 * @private
 */

 LinkBot.prototype._parseBuffer = function (message) {
    var self = this;
    var args = message.text.split(' ')
    var c = args[0].substr(1);
    var handle = args[1];
    var link = message.text.split(' ').slice(1).join(' ');

    switch (c) {
        case 'bookmark':
            console.log("=== Adding bookmark... ===");
            if (handle == '')
                self.postMessage(message.channel, "Nothing to bookmark. Usage: .bookmark <keyword> <data>", {as_user: true});
            else
                this._addLink(handle, message, message.channel);
            break;

        case 'unmark':
            console.log("=== Removing bookmark... ===");
            if (handle == null)
                self.postMessage(message.channel, "Nothing to unbookmark. Usage: .unmark <keyword>", {as_user: true});
            else
                this._removeLink(handle, message.channel);
            break;

        case 'search':
            console.log("=== Searching bookmarks... ===");
            this._searchBookmarks(handle, message.channel);
            break;

        case 'g':
            console.log("=== Googling... ===");
            self.postMessage(message.channel, "https://www.google.com/search?q=" + encodeURIComponent(link));
            break;

        case 'weather':
            console.log("=== Fetching weather... ===");
            this._getWeather(handle, message.channel);
            break;

        default:
            console.log("=== Looking up bookmark... ===");
            this._pmLink(c, message.channel);
            break;

    }
 };

/**
 * Posts matching links to the channel
 */
 LinkBot.prototype._pmLink = function (handle, channel) {
    var self = this;
    this._fetchBookmark(handle).then(function(link) {
        if (link == null) {

        } else {
            console.log("Posting", link);
            return self.postMessage(channel, link, {as_user: true});
        }
        
    });
 };

/**
 * Searches db for a matching handle and returns the link
 * @param {object} message
 * @returns {boolean}
 * @private
 */
 LinkBot.prototype._fetchBookmark = function (handle) {
    console.log("Checking handle:", handle);
    var self = this;
    var deferred = Q.defer();

    self.db.get('SELECT link FROM bookmarks WHERE handle = $handle AND ACTIVE = 1 LIMIT 1', { $handle: handle }, function (err, bookmark) {
        if (err) {
            deferred.reject(err);
        }

        if (bookmark == null) {
            console.log("Nothing found.");
            deferred.resolve(null);
        } else {
            console.log("Found:", bookmark['link']);
            deferred.resolve(bookmark['link']);
        }
        
    });

    return deferred.promise;
};

/**
 * Add a link to the database
 * @param {object} message
 * @returns {boolean}
 * @private
 */

 LinkBot.prototype._addLink = function (handle, message, channel) {
    var self = this;
    var link = message.text.split(' ').slice(2).join(' ');
    
    this._fetchBookmark(handle).then(function(res) {
        if (res == null) {
            self.postMessage(channel, "Bookmark added.", {as_user: true});
            return self._addBookmark(handle, link, channel);
        } else {
            console.log("Handle exists:", handle);
            return self.postMessage(channel, "Bookmark already exists.", {as_user: true});
        }
    });
 };

 LinkBot.prototype._addBookmark = function (handle, link, channel) {
    var self = this;
    console.log("=== Linking... === " + handle + ' ' + link);
    return self.db.run('INSERT INTO bookmarks (handle, link, active) VALUES (?, ?, 1)', [ handle, link ]);
};


/**
 * Remove link from database
 * @param {object} message
 * @returns {boolean}
 * @private
 */

 LinkBot.prototype._removeLink = function (handle, channel) {
    var self = this;
    
    this._fetchBookmark(handle).then(function(link) {
        if (link == null) {
            return self.postMessage(channel, "Nothing to delete.", {as_user: true});
        } else {
            console.log("Removing handle:", handle);
            self._delBookmark(handle, channel);
        } 
    });
 };

 LinkBot.prototype._delBookmark = function (handle, channel) {
    var self = this;

    self.postMessage(channel, "Toast.", {as_user: true});
    return self.db.run('UPDATE bookmarks SET active = 0 WHERE handle = ? AND active = 1', [ handle ]);

 }

 LinkBot.prototype._getWeather = function (zipcode, channel) {
    var self = this;

    weather.find({
        search: zipcode,
        degreeType: 'F'
    }, 
    function (err, result) {
        if (err) {
            console.log(err);
            return self.postMessage(channel, "Unable to fetch weather. Usage: .weather <zipcode>", {as_user: true});
        }
 
        var string = JSON.stringify(result)
        var obj = JSON.parse(string);

        var output = obj[0]['location']['name'] + ' — High: ' + obj[0]['forecast'][0]['high'] + ' Low: ' + obj[0]['forecast'][0]['low'] + ': Current: ' + obj[0]['current']['temperature'];

        return self.postMessage(channel, output, {as_user: true});
    });

 }

module.exports = LinkBot;
