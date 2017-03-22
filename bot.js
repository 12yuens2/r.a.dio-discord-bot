var fs = require("fs");
var request = require("request");
var discord = require("discord.js");
var bot = new discord.Client();

var RADIO_CHANNELS = [];
var CONFIG_JSON = {};
const RADIO_LINK = "https://relay0.r-a-d.io/main.mp3";
const API_LINK = "https://r-a-d.io/api";

/* Config file where bot api key and voice channels are stored */
const CONFIG = "config.json";

/**
 * Stream RADIO_LINK to the given voice connection.
 */
var play_radio = function(voice_connection) {
    var dispatcher = voice_connection.playStream(request(RADIO_LINK), {seek: 0, volume: 1});
}

/**
 * Find the appropriate voice channel to join given the id.
 */
function get_radio_channel(channel_id, channels) {
    for (var i = 0; i <  channels.length; i++) {
        var channel = channels[i];

        if (channel.type == "voice" && channel.id == channel_id) {
            return channel
        }
    }
}

/**
 * Join the given channel and start playing the radio.
 */
function join_channel(channel) {
    console.log("Joined voice channel " + channel.name);
    channel.join().then(play_radio);
}

/**
 * Move to the given channel. Does not restart playing the stream.
 * If the bot is already playing, it should continue to play.
 */
function move(channel) {
    console.log("Moved to voice channel " + channel.name)
    channel.join();
}



function add_channel(channel_id) {
    var channel_to_join = get_radio_channel(channel_id, bot.channels.array());
    join_channel(channel_to_join);
}

function move_to_channel(channel_id) {
    var channel_to_move = get_radio_channel(channel_id, bot.channels.array());
    move(channel_to_move);
}


/**
 * Get information on songs from r-a-d.io/api
 */
function get_info_api(callback) {
    request(API_LINK, callback);
}


function send_playing(channel) {
    get_info_api(function(err, res, body) {
        info = JSON.parse(body);
        channel.sendMessage("Now playing: " + info["main"]["np"]);
    });
}

function send_next(channel) {
    get_info_api(function(err, res, body) {
        info = JSON.parse(body);
        channel.sendMessage("Next song: " + info["main"]["queue"][0]["meta"]);
    })
}

function send_queue(channel) {
    get_info_api(function(err, res, body) {
        info = JSON.parse(body);
        queue = info["main"]["queue"]
        message = "Queue: "
        for (var i = 0; i < queue.length; i++) {
            message += "\n" + (i+1) + ". " + queue[i]["meta"];
        }

        channel.sendMessage(message);
    });
}


function send_dj(channel) {
    get_info_api(function(err, res, body) {
        info = JSON.parse(body);
        dj = info["main"]["dj"]["djname"];

        channel.sendMessage("DJ: " + dj);
    });
}

/* 
 * Bot event handlers 
 */

bot.on("message", function(msg) {

    switch(msg.content) {
        case "~playing":
            send_playing(msg.channel);
            break;
        case "~next":
            send_next(msg.channel);
            break;
        case "~queue":
            send_queue(msg.channel);
            break;
        case "~dj":
            send_dj(msg.channel);
            break;
        case (msg.content.match(/~join\s[0-9]*/) || {}).input:
            add_channel(msg.content.split(" ")[1]);
            break; 
        case (msg.content.match(/~move\s[0-9]*/) || {}).input:
            move_to_channel(msg.content.split(" ")[1]);
            break;

    }
});

bot.on("ready", function() {
    console.log("Ready");

    for (var i = 0; i < RADIO_CHANNELS.length; i++) {
        var channel_id = RADIO_CHANNELS[i].id;
        var channel = get_radio_channel(channel_id, bot.channels.array());

        if (channel != undefined) {
            join_channel(channel);
        }
    }

});


/* Log the bot in using config file. Joins any channels listed in "voice_channels". */
fs.readFile(CONFIG, "utf-8", function(error, data) {
    if (error) {
        console.log(error);
    }

    CONFIG_JSON = JSON.parse(data);

    RADIO_CHANNELS = CONFIG_JSON["voice_channels"];
    bot.login(CONFIG_JSON["api_key"]);
});