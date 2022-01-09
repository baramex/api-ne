function verifUser(uuid) {
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

function getProfilFromAccessToken(accessToken) {
    return new Promise((res, rej) => {
        axios.get("https://api.minecraftservices.com/minecraft/profile", { headers: { "Accept": "application/json", "Authorization": "Bearer " + accessToken } })
            .then(mc => {
                res(mc.data);
            }).catch(err => rej(err.response.data));
    });
}

module.exports.getProfilFromAccessToken = getProfilFromAccessToken;
module.exports.verifUser = verifUser;