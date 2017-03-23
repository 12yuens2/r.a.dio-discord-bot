var fs = require("fs");
var request = require("request");
var ytdl = require("ytdl-core");
var discord = require("discord.js");
var bot = new discord.Client();

var YT_QUEUE = ["https://www.youtube.com/watch?v=NqxJ191ecPQ", "https://www.youtube.com/watch?v=a1Y73sPHKxw", "https://www.youtube.com/watch?v=a1Y73sPHKxw"];
var CURRENT_YT = "";

var RADIO_CHANNELS = [];
var CHANNELS_JOINED = [];
var CONFIG_JSON = {};

var playing_radio = true;

const RADIO_LINK = "https://relay0.r-a-d.io/main.mp3";
const API_LINK = "https://r-a-d.io/api";

/* Config file where bot api key and voice channels are stored */
const CONFIG = "config.json";

/**
 * Stream RADIO_LINK to the given voice connection.
 */
var play_radio = function(voice_connection) {
    playing_radio = true;
    var dispatcher = voice_connection.playStream(request(RADIO_LINK), {seek: 0, volume: 1});
}

function play_link(stream) {
    voice_connections = bot.voiceConnections.array();
    var dispatcher;
    for (var i = 0; i < voice_connections.length; i++) {
        vc = voice_connections[i]
        dispatcher = vc.playStream(stream, {seek: 0, volume: 2});
    }

    dispatcher.on("end", function() {
        console.log("ended link");
        play_queue();
    });
}

function play_queue() {
    console.log(YT_QUEUE);
    playing_radio = false;
    if (YT_QUEUE.length == 0) {
        console.log("back to radio");
        for (var i = 0; i < bot.voiceConnections.array().length; i++) {
            play_radio(bot.voiceConnections.array()[i]);
        }
    }
    else {
        var link = YT_QUEUE.splice(0, 1)[0];
        var stream = ytdl(link, {filter: "audioonly"});
        ytdl.getInfo(link, function(err, info) {
            CURRENT_YT = info.title;
        });

        play_link(stream);
    }

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

    // console.log(bot.voiceConnections.array().length);

    for (var i = 0; i < bot.voiceConnections.array().length; i++) {
        console.log(bot.voiceConnections.array()[i].channel);
    }
}



function add_channel(channel_id) {
    var channel_to_join = get_radio_channel(channel_id, bot.channels.array());
    join_channel(channel_to_join);
}

function move_to_channel(channel_id) {
    var channel_to_move = get_radio_channel(channel_id, bot.channels.array());
    move(channel_to_move);
}

function add_to_queue(link) {
    console.log(YT_QUEUE);
    YT_QUEUE.push(link);

    if (playing_radio) {
        play_queue();
    }
}


/**
 * Get information on songs from r-a-d.io/api
 */
function get_info_api(callback) {
    request(API_LINK, callback);
}


function send_playing(channel) {
    if (playing_radio) {
        get_info_api(function(err, res, body) {
            info = JSON.parse(body);
            channel.sendMessage("Now playing: " + info["main"]["np"]);
        });
    }
    else {
        channel.sendMessage("Now playing: " + CURRENT_YT);
    }
}

function send_next(channel) {
    if (playing_radio || YT_QUEUE.length == 0) {
        get_info_api(function(err, res, body) {
            info = JSON.parse(body);
            channel.sendMessage("Next song: " + info["main"]["queue"][0]["meta"]);
        });
    }
    else {
        var link = YT_QUEUE[0];
        ytdl.getInfo(link, function(err, info) {
            channel.sendMessage("Next song: " + info.title);
        });
    }
}

function send_queue(channel) {
    if (playing_radio) {
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
    else {
        var infos = [];
        for (var i = 0; i < YT_QUEUE.length; i++) {
            var promise = ytdl.getInfo(YT_QUEUE[i]);
            infos.push(promise);
        }

        /* Wait for all promises to finish */
        Promise.all(infos).then(function(info) {
            var message = "Queue: ";
            for (var i = 0; i < YT_QUEUE.length; i++) {
                message += "\n" + (i+1) + ". " + info[i].title;
            }

            channel.sendMessage(message);
        });

    }

}


function send_dj(channel) {
    get_info_api(function(err, res, body) {
        info = JSON.parse(body);
        dj = info["main"]["dj"]["djname"];

        channel.sendMessage("DJ: " + dj);
    });
}

// function send_message(channel, msg)

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

        case (msg.content.match(/~add\s(.*)/) || {}).input:
            add_to_queue(msg.content.split(" ")[1]);
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