import express from "express";
const app = express();
import bodyParser from "body-parser";
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const server = app.listen(3521);

import axios from "axios";

import mongo from "mongodb";
const MongoClient = mongo.MongoClient;
const dbName = 'new-empires';
/**
 * @type {mongo.Db}
 */
export var db;

/**
 * @type {"Release" | "Dev"}
 */
const runType = "Dev";

MongoClient.connect(runType == "Dev" ? "mongodb://localhost:27017/" : 'mongodb://baramex:***REMOVED***@localhost:27017/', function (err, client) {
    console.log("Connected successfully to mongodb");
    db = client.db(dbName + (runType == "Dev" ? "-dev" : ""));
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
            /*
            _id
            discordID
            uuid
            date
            */
            axios.get("http://localhost:4001/requests/discord/member?id=" + user.discordID).then(user => {
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