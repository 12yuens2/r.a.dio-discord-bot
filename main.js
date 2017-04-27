var discord = require("discord.js");
var client = new discord.Client();

var bot = require("./bot");


bot.init("config.json", client);

/* 
 * Bot event handlers 
 */
client.on("message", function(msg) {

    switch(msg.content) {
        case "~playing":
            bot.send_playing(msg.channel);
            break;
        case "~next":
            bot.send_next(msg.channel);
            break;
        case "~queue":
            bot.send_queue(msg.channel);
            break;
        case "~dj":
            bot.send_dj(msg.channel);
            break;
        case "~schedule":
            bot.send_schedule(msg.channel);
            break;

        // case (msg.content.match(/~add\s(.*)/) || {}).input:
        //     add_to_queue(msg.content.split(" ")[1]);
        //     break;

        case (msg.content.match(/~join\s[0-9]*/) || {}).input:
            var channel_id = msg.content.split(" ")[1];
            bot.get_channel(channel_id, client.channels.array(), bot.join_channel);
            break; 
        case (msg.content.match(/~move\s[0-9]*/) || {}).input:
            bot.move_channel(msg.content.split(" ")[1]);
            break;

    }
    
});

client.on("ready", function() {
    console.log("Ready");
    console.log(bot.RADIO_CHANNELS);

    bot.join_init_channels(client.channels.array());

});