const axios = require("axios");
/**
 * @type {mongo.Db}
 */
var db;
require("./database").getDB(res => {
    db = res;
});

function verifUser(uuid) {
    return new Promise((res, rej) => {
        if (!db) return rej();
        if (!uuid) res(false);
        db.collection("members-mc").findOne({ uuid }).then(user => {
            axios.get("https://discord.com/api/guilds/" + process.env.GUILD_ID + "/members/" + user.discordID, { headers: { authorization: "Bot " + process.env.BOT_TOKEN } }).then(discord => {
                if (discord.data) res(discord.data.user.username + "#" + discord.data.user.discriminator);
                else res(false);
            }).catch(() => res(false));
        }).catch(() => {
            db.collection("members-mc").insertOne({ _id: generateID(), discordID: undefined, uuid, date: new Date() });

            res(false);
        });
    });
}

function getProfilFromAccessToken(accessToken) {
    return new Promise((res, rej) => {
        axios.get("https://api.minecraftservices.com/minecraft/profile", { headers: { "Accept": "application/json", "Authorization": "Bearer " + accessToken } })
            .then(mc => {
                res(mc.data);
            }).catch(err => rej(err.response.data));
    });
}

function generateID() {
    var a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    var b = "";
    for (var i = 0; i < 16; i++) {
        var j = (Math.random() * (a.length - 1)).toFixed(0);
        b += a[j];
    }
    return b;
}

module.exports.getProfilFromAccessToken = getProfilFromAccessToken;
module.exports.verifUser = verifUser;