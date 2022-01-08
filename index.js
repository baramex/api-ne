import express from "express";
const app = express();
import bodyParser from "body-parser";
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const server = app.listen(3521);

import axios from "axios";

import mongo from "mongodb";
const MongoClient = mongo.MongoClient;

/**
 * @type {mongo.Db}
 */
export var db;

const guildID = require("./tokens.json").guildID;
const clientID = require("./tokens.json").clientID;
const clientSecret = require("./tokens.json").clientSecret;
const botToken = require("./tokens.json").botToken;

MongoClient.connect(require("./tokens.json").mongodbLink, function (err, client) {
    console.log("Connected successfully to mongodb");
    db = client.db(require("./tokens.json").dbName);
});

import * as Microsoft from "./microsoft.js";
import * as Mojang from "./mojang.js";

app.post("*", (req, res, next) => {
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

export function generateID() {
    var a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    var b = "";
    for (var i = 0; i < 16; i++) {
        var j = (Math.random() * (a.length - 1)).toFixed(0);
        b += a[j];
    }
    return b;
}

export function verifUser(uuid) {
    return new Promise((res, rej) => {
        if (!uuid) res(false);
        db.collection("members-mc").findOne({ uuid }).then(user => {
            axios.get("https://discord.com/api/guilds/" + guildID + "/members/" + user.discordID, { headers: { authorization: "Bot " + botToken } }).then(user => {
                if (user) res(true);
                else res(false);
            }).catch(() => res(false));
        }).catch(() => {
            db.collection("members-mc").insertOne({ _id: generateID(), discordID: undefined, uuid, date: new Date() });

            res(false);
        });
    });
}

export function getProfilFromAccessToken(accessToken) {
    return new Promise((res, rej) => {
        axios.get("https://api.minecraftservices.com/minecraft/profile", { headers: { "Accept": "application/json", "Authorization": "Bearer " + accessToken } })
            .then(mc => {
                res(mc.data);
            }).catch(err => rej(err.response.data));
    });
}