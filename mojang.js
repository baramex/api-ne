import axios from "axios";
import { getProfilFromAccessToken, verifUser } from ".";

export function auth(username, password) {
    return new Promise((res, rej) => {
        axios.post("https://authserver.mojang.com/authenticate", {
            agent: {
                name: "Minecraft"
            },
            username,
            password,
        }, { headers: { "Content-Type": "application/json" } }).then(async r => {
            var a = false;
            await verifUser(r.data.selectedProfile.id).then(() => a = true).catch(() => a = false);
            res({ ...r.data, discordLinked: a });
        }).catch(err => rej(err.response.data));
    });
}

function refresh(accessToken, clientToken) {
    return new Promise((res, rej) => {
        axios.post("https://authserver.mojang.com/refresh", {
            accessToken,
            clientToken
        }, { headers: { "Content-Type": "application/json" } }).then(r => res(r.data)).catch(err => rej(err.response.data));
    });
}

export function invalidate(accessToken, clientToken) {
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

export function token(accessToken, clientToken) {
    return new Promise(async (res, rej) => {
        getProfilFromAccessToken(accessToken).then((profile) => {
            verifUser(profile.selectedProfile.id).then(() => {
                validate(accessToken, clientToken).then(() => {
                    res(true)
                }).catch(() => {
                    refresh(accessToken, clientToken).then(res).catch(rej);
                });
            }).catch(() => rej({ discordLinked: false }));
        }).catch(rej);
    });
}