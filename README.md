# Linkbot

Linkbot is a simple bot that lets you save and retrieve text snippets on Slack. It's a great way to quickly post quotes, reaction images, and links using simple .keyword commands.

## Setup

```sh
# Install dependencies
npm install
```

Add your Slack's API key to `token-example.js` and rename to `token.js`. Settings can be changed in `bin/bot.js`.

## Running

```sh
npm start
```

Linkbot should appear in your Slack's direct messages list. Invite Linkbot to whichever channels you want.

## Example Usage

![Linkbot Usage](https://github.com/andymai/linkbot/blob/master/example/linkbot-example.png)

## Available Commands

```sh
# Create a link
.bookmark <handle> <link>

# Delete a link
.unmark <handle>

# Link a google query
.g <query>

# Lookup Weather
.weather <zipcode>
```

## Todo

* Support ability to search existing bookmarks.
