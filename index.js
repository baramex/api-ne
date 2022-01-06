const app = require("express")();
const server = app.listen(3521);

export const jwt = require("jsonwebtoken");
/**
 * @type {axios.Axios}
 */
export const axios = require("axios");

const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;
const dbName = 'new-empires';
/**
 * @type {mongo.Db}
 */
export var db;

/**
 * @type {"Release" | "Dev"}
 */
const runType = "Release";

MongoClient.connect(runType == "Dev" ? "mongodb://localhost:27017/" : 'mongodb://baramex:***REMOVED***@localhost:27017/', function (err, client) {
    console.log("Connected successfully to mongodb");
    db = client.db(dbName + (runType == "Dev" ? "-dev" : ""));
});

import { auth, token } from "./microsoft";

app.get("*", (req, res) => {

});

app.post("/microsoft/login", (req, res) => {
    if (req.body && req.body.flow) auth("login", req.body.flow).then(r => {
        console.log(r);
        res.status(r.response.status).json(r.response.data);
    }).catch(r => {
        console.log(r);
        res.status(r.response.status).json(r.response.data);
    });
    else res.status(400).json({error: "InvalidBody", messageError: "Code provides is null or wrong"});
});

app.post("/microsoft/token", (req, res) => {
    if (req.body && req.body.accessToken && req.body.refreshToken) token(req.body.accessToken, req.body.refreshToken).then(r => {
        console.log(r);
        res.status(r.response.status).json(r.response.data);
    }).catch(r => {
        console.log(r);
        res.status(r.response.status).json(r.response.data);
    });
    else res.status(400).json({error: "InvalidBody", messageError: "Access token and/or refresh token are null"});
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