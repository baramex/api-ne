const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const server = app.listen(3521);
require("dotenv").config();

const axios = require("axios");

const mongo = require("mongodb");
const MongoClient = mongo.MongoClient;

/**
 * @type {mongo.Db}
 */
var db;

const { GUILD_ID: guildID, CLIENT_ID: clientID, CLIENT_SECRET: clientSecret, BOT_TOKEN: botToken } = process.env;

MongoClient.connect(process.env.DB, function (err, client) {
    console.log("Connected successfully to mongodb");
    db = client.db(process.env.DB_NAME);
});

const Mojang = require("./mojang");
const Microsoft = require("./microsoft");
const { getProfilFromAccessToken } = require("./profil");

var bans = [];
var requests = [];
var lastUpdate = new Date();

app.post("*", (req, res, next) => {
    var client_ip;
    if (req.headers['cf-connecting-ip'] && req.headers['cf-connecting-ip'].split(', ').length) {
        var first = req.headers['cf-connecting-ip'].split(', ');
        client_ip = first[0];
    } else {
        client_ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    }

    var date10m = new Date();
    date10m.setMinutes(date10m.getMinutes() - 10);

    if (new Date().getTime() - lastUpdate.getTime() >= 5000) {
        requests = requests.filter(a => a.date > date10m.getTime());
        bans = bans.filter(a => a.end > new Date().getTime());
        lastUpdate = new Date();
    }

    var ban = bans.find(a => a.ip == client_ip);
    if (ban) {
        return res.status(403).json({ error: "TooManyRequests", time: ban.end - new Date().getTime() })
    }

    var curr = requests.filter(a => a.ip == client_ip);

    var date5s = new Date();
    date5s.setSeconds(date5s.getSeconds() - 10);

    var reqs5s = curr.filter(a => a.date > date5s.getTime()).length;
    var reqs10m = curr.filter(a => a.date > date10m.getTime()).length;

    if (reqs5s > 3) {
        bans.push({ ip: client_ip, end: new Date().getTime() + 1000 * 15 });
    }

    if (reqs10m > 30) {
        bans.push({ ip: client_ip, end: new Date().getTime() + 1000 * 60 });
        requests = requests.filter(a => a.ip != client_ip);
    }

    requests.push({ ip: client_ip, date: new Date().getTime() });

    next();
});

app.post("/microsoft/login", (req, res) => {
    if (req.body && req.body.flow) Microsoft.auth("login", req.body.flow).then(r => {
        res.status(200).json(r);
    }).catch(r => {
        res.status(400).json(r);
    });
    else res.status(400).json({ error: "InvalidBody", messageError: "Code provides is null or wrong" });
});

app.post("/microsoft/token", (req, res) => {
    if (req.body && req.body.accessToken && req.body.refreshToken) Microsoft.token(req.body.accessToken, req.body.refreshToken).then(r => {
        res.status(200).json(r);
    }).catch(r => {
        res.status(400).json(r);
    });
    else res.status(400).json({ error: "InvalidBody", messageError: "Access token and/or refresh token are null" });
});

app.post("/mojang/login", (req, res) => {
    if (req.body && req.body.username && req.body.password) Mojang.auth(req.body.username, req.body.password).then(r => {
        res.status(200).json(r);
    }).catch(r => {
        res.status(400).json(r);
    });
    else res.status(400).json({ error: "InvalidBody", messageError: "Username or password are invalid" });
});

app.post("/mojang/token", (req, res) => {
    if (req.body && req.body.accessToken && req.body.clientToken) Mojang.token(req.body.accessToken, req.body.clientToken).then(r => {
        res.status(200).json(r);
    }).catch(r => {
        res.status(400).json(r);
    });
    else res.status(400).json({ error: "InvalidBody", messageError: "Access token and/or client token are null" });
});

app.post("/mojang/invalidate", (req, res) => {
    if (req.body && req.body.accessToken && req.body.clientToken) Mojang.invalidate(req.body.accessToken, req.body.clientToken).then(r => {
        res.status(200).json(r);
    }).catch(r => {
        res.status(400).json(r);
    });
    else res.status(400).json({ error: "InvalidBody", messageError: "Access token and/or client token are null" });
});

app.post("/discord-auth", (req, res) => {
    if (req.body && req.body.code && req.body.accessToken && req.body.redirectUri) {
        axios.post("https://discord.com/api/oauth2/token", `client_id=${clientID}&client_secret=${clientSecret}&grant_type=authorization_code&code=${req.body.code}&redirect_uri=${req.body.redirectUri}`, { 'Content-Type': 'application/x-www-form-urlencoded' }).then(result => {
            var accessToken = result.data.access_token;
            var tokenType = result.data.token_type;

            getProfilFromAccessToken(req.body.accessToken).then(mc => {
                axios.get("https://discord.com/api/users/@me", { headers: { authorization: tokenType + " " + accessToken } }).then(user => {
                    db.collection("members-mc").findOne({ discordID: user.date.id }).catch(() => res.status(400).json({ error: "AccountAlreadyUsed", messageError: "Discord account is already used" })).then(() => {
                        axios.get("https://discord.com/api/users/@me/guilds", { headers: { authorization: tokenType + " " + accessToken } }).then(r => {
                            if (r.data.find(a => a.id == guildID)) {
                                res.status(200).json({ addToServer: false });
                                updateMinecraftAccount(user.data.id, mc.id);
                                revokeToken(accessToken);
                            }
                            else {

                                axios.put("https://discord.com/api/guilds/" + guildID + "/members/" + user.data.id, { access_token: accessToken }, { headers: { "Content-Type": "application/json", authorization: "Bot " + botToken } })
                                    .then(() => {
                                        res.status(200).json({ addToServer: true });
                                        updateMinecraftAccount(user.data.id, mc.id);
                                        revokeToken(accessToken);
                                    }).catch(err => res.status(400).json(err.response.data));
                            }
                        }).catch(err => res.status(400).json(err.response.data));
                    });
                }).catch(err => res.status(400).json(err.response.data));
            }).catch(() => {
                res.status(400).json({ error: "InvalidToken", messageError: "Account not found" });
            });
        }).catch(err => res.status(400).json(err.response.data));
    }
    else {
        res.status(400).json({ error: "InvalidBody", messageError: "Code and/or access token and/or redirect uri are null" });
    }
});

function revokeToken(accessToken) {
    return new Promise((res, rej) => {
        axios.post("https://discord.com/api/oauth2/token/revoke", `client_id=${clientID}&client_secret=${clientSecret}&token=${accessToken}`, { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
            .then(r => res(r.data)).catch(r => rej(r.response.data));
    });
}

function updateMinecraftAccount(discordID, uuid) {
    db.collection("members-mc").findOneAndUpdate({ uuid }, { $set: { discordID } }).catch(console.error);
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