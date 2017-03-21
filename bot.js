var fs = require("fs");
var request = require("request");
var discord = require("discord.js");
var bot = new discord.Client();

const RADIO_CHANNELS = ["XFM TEST", "XFM Radio"];
const RADIO_LINK = "https://relay0.r-a-d.io/main.mp3";
const API_LINK = "https://r-a-d.io/api";

/* 'loginfo' is the file that contains credentials for the bot i.e. api key */
const LOGIN_INFO = "loginfo";

/**
 * Play the given link in an infinite loop.
 */
var play_radio = function(connection) {
	var dispatcher = connection.playStream(request(RADIO_LINK), {seek: 0, volume: 1});

	dispatcher.on("end", function() {
		play_radio(link, connection);
	});
}

/**
 * Find the appropriate voice channels to join.
 */
function get_radio_channel(channels) {
	channels_to_join = [];
	for (var i = 0; i <  channels.length; i++) {
		var channel = channels[i];
		if (channel.type == "voice" && RADIO_CHANNELS.includes(channel.name)) {
			channels_to_join.push(channel);
		}
	}
	return channels_to_join;
}


function get_info_api(callback) {
	request(API_LINK, callback);
}

function send_playing(channel) {
	get_info_api(function(err, res, body) {
		info = JSON.parse(body);
		channel.sendMessage("Now playing: " + info["main"]["np"]);
	});
}

/* 
 * Bot event handlers 
 */
bot.on("message", function(msg) {
	switch(msg.content) {
		case "!playing":
			send_playing(msg.channel);
			break;
	}
});

bot.on("ready", function() {
	console.log("Ready");
	var channels = get_radio_channel(bot.channels.array());

	for (var i = 0; i < channels.length; i++) {
		channels[i].join().then(play_radio);
	}
});


/* Log the bot in using credentials file */
fs.readFile(LOGIN_INFO, "utf-8", function(error, data) {
	if (error) {
		console.log(error);
	}

	bot.login(data);
});