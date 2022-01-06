import { axios } from "./index";

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
            //??
            await verifUser(r.data.uuid).then(() => a = true).catch(() => a = false);
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

export function token(accessToken, clientToken, uuid) {
    return new Promise(async (res, rej) => {
        var a = false;
        await verifUser(uuid).then(() => a = true).catch(() => a = false);
        if(!a) return rej({discordLinked: false});

        validate(accessToken, clientToken).then(() => {
            res(true);
        }).catch(() => {
            refresh(accessToken, clientToken).then(res).catch(rej);
        });
    });
}