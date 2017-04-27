var fs = require("fs");
var request = require("request");
var ytdl = require("ytdl-core");

var bot = module.exports = {

    /* R-a-d.io constants*/
    RADIO_LINK: "https://relay0.r-a-d.io/main.mp3",
    API_LINK: "https://r-a-d.io/api",

    CONFIG: "",

    RADIO_CHANNELS: [],
    CHANNELS_JOINED: [],
    // CONFIG_JSON: {},

    PLAYING_RADIO: true,

    /* Youtube queue constants */
    YT_QUEUE: [],
    CURRENT_YT: "",


    init: function(config_file, client) {
        fs.readFile(config_file, "utf-8", function(error, data) {

            if (error) {
                console.log(error);
            }

            config_json = JSON.parse(data);

            bot.RADIO_CHANNELS = config_json["voice_channels"];
            client.login(config_json["api_key"]);

        });
    },

    /* R-a-d.io functions */
    play_radio: function(voice_connection) {
        bot.PLAYING_RADIO = true;
        var dispatcher = voice_connection.playStream(request(bot.RADIO_LINK), {seek: 0, volume: 1});
    },


    /**
     * Go through channels to find a voice channel with the given channel_id
     */
    get_radio_channel: function(channel_id, channels) {
        for (var i = 0; i <  channels.length; i++) {
            var channel = channels[i];

            if (channel.type == "voice" && channel.id == channel_id) {
                return channel;
            }
        }
    },

    /**
     * Join all voice channels specified in the config file.
     */
    join_init_channels: function(client_channels) {
        for (var i = 0; i < bot.RADIO_CHANNELS.length; i++) {
            var channel_id = bot.RADIO_CHANNELS[i].id;
            var channel = bot.get_radio_channel(channel_id, client_channels);

            if (channel != undefined) {
                bot.join_channel(channel);
            }
        }
    },


    /**
     * Join the given channel and start playing the radio.
     */
    join_channel: function(channel) {
        console.log("Joined voice channel " + channel.name);
        channel.join().then(bot.play_radio);
    },

    /**
     * Move to the given channel. Does not restart playing the stream.
     * If the bot is already playing, it should continue to play.
     */
    move_channel: function(channel) {
        console.log("Moved to voice channel " + channel.name);
        channel.move();
    },


    /**
     * Gets the channel using channel_id from the client.
     * Then calls the callback function with the found channel.
     */
    get_channel: function(channel_id, client_channels, callback) {
        var channel = bot.get_radio_channel(channel_id, client_channels);

        if (channel != null) {
            callback(channel);
        }
        
    },


    get_api_info: function(callback) {
        request(bot.API_LINK, callback);
    },

    send_playing: function(channel) {
        if (bot.PLAYING_RADIO) {
            bot.get_api_info(function(err, res, body) {
                var info = JSON.parse(body)["main"]["np"];
                channel.sendMessage("Now playing: " + info);
            });
        }
    },

    send_next: function(channel) {
        bot.get_api_info(function(err, res, body) {
            var info = JSON.parse(body)["main"]["queue"][0]["meta"];
            channel.sendMessage("Next song: " + info);
        })
    },

    send_queue: function(channel) {
        bot.get_api_info(function(err, res, body) {
            var queue = JSON.parse(body)["main"]["queue"];
            var message = "Queue: "

            for (var i = 0; i < queue.length; i++) {
                message += "\n" + (i+1) + ". " + queue[i]["meta"];
            }

            channel.sendMessage(message);
        });
    },

    send_dj: function(channel) {
        bot.get_api_info(function(err, res, body) {
            info = JSON.parse(body);
            dj = info["main"]["dj"]["djname"];

            channel.sendMessage("DJ: " + dj);
        });
    },

    send_schedule: function(channel) {
        channel.sendFile("./schedule.png", "schedule.png");
    }

}

