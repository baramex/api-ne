const axios = require("axios");
const { getProfilFromAccessToken, verifUser } = require("./profil");

function auth(username, password) {
    return new Promise((res, rej) => {
        axios.post("https://authserver.mojang.com/authenticate", {
            agent: {
                name: "Minecraft"
            },
            username,
            password,
        }, { headers: { "Content-Type": "application/json" } }).then(r => {
            verifUser(r.data.selectedProfile.id).then(discordLinked => {
                res({ ...r.data, discordLinked, type: "login" });
            });
        }).catch(err => rej(err.response.data));
    });
}

function refresh(accessToken, clientToken) {
    return new Promise((res, rej) => {
        axios.post("https://authserver.mojang.com/refresh", {
            accessToken,
            clientToken
        }, { headers: { "Content-Type": "application/json" } }).then(r => {
            verifUser(r.data.selectedProfile.id).then(discordLinked => {
                res({ ...r.data, discordLinked, type: "refresh" });
            });
        }).catch(err => rej(err.response.data));
    });
}

function invalidate(accessToken, clientToken) {
    return new Promise((res, rej) => {
        axios.post("https://authserver.mojang.com/invalidate", {
            accessToken,
            clientToken
        }, { headers: { "Content-Type": "application/json" } }).then(r => res(r.data)).catch(err => rej(err.response.data));
    });
}

function validate(accessToken, clientToken) {
    return new Promise((res, rej) => {
        axios.post("https://authserver.mojang.com/validate", { accessToken, clientToken }, { headers: { "Content-Type": "application/json" } }).then(r => res(r.data)).catch(err => rej(err.response.data));
    });
}

function token(accessToken, clientToken) {
    return new Promise((res, rej) => {
        validate(accessToken, clientToken).then(() => {
            getProfilFromAccessToken(accessToken).then((profile) => {
                verifUser(profile.id).then(discordLinked => {
                    res({ discordLinked, type: "valid" });
                });
            }).catch(rej);
        }).catch(() => {
            refresh(accessToken, clientToken).then(res).catch(rej);
        });
    });
}

module.exports.token = token;
module.exports.auth = auth;
module.exports.invalidate = invalidate;