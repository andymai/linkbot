'use strict';

/**
 * Command line script that generates a SQLite database
 *
 * Usage:
 *
 *   node databaseGenerator.js [destFile]
 *
 *   destFile is optional and it will default to "linkbot.db"
 *
 * @author Andy Mai <hi@andymai.com>
 */

var path = require('path');
var sqlite3 = require('sqlite3').verbose();

var outputFile = process.argv[2] || path.resolve(__dirname, 'linkbot.db');
var db = new sqlite3.Database(outputFile);

// Prepares the database connection in serialized mode
db.serialize();
// Creates the database structure
db.run('CREATE TABLE IF NOT EXISTS info (name TEXT PRIMARY KEY, val TEXT DEFAULT NULL)');
db.run('CREATE TABLE IF NOT EXISTS bookmarks (id INTEGER PRIMARY KEY, handle TEXT, link TEXT, active INTEGER)');
