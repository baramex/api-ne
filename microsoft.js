import { axios, db, generateID, jwt } from "./index";

const config = {
    auth: {
        clientId: "d301ed72-b2d7-4552-9d2a-c428da066dc8",
        clientSecret: "***REMOVED***",
    }
};

const authCodeUrlParameters = {
    redirectUri: "http://localhost:65230/auth",
    scopes: ["XboxLive.signin", "offline_access"]
};

export function auth(type, value) {
    return new Promise((res, rej) => {
        const dataToken = type=="login"?`client_id=${config.auth.clientId}&client_secret=${config.auth.clientSecret}&code=${value}&grant_type=authorization_code&redirect_uri=${authCodeUrlParameters.redirectUri}`:`client_id=${config.auth.clientId}&client_secret=${config.auth.clientSecret}&refresh_token=${value}&grant_type=refresh_token&redirect_uri=${authCodeUrlParameters.redirectUri}`;
        axios.post("https://login.live.com/oauth20_token.srf", dataToken, { headers: { "Content-Type": "application/x-www-form-urlencoded" } }).then(data => {
            var auth = data.data;

            const dataLogin = {
                Properties: {
                    AuthMethod: "RPS",
                    SiteName: "user.auth.xboxlive.com",
                    RpsTicket: "d=" + auth.access_token
                },
                RelyingParty: "http://auth.xboxlive.com",
                TokenType: "JWT"
            };
            axios.post("https://user.auth.xboxlive.com/user/authenticate", dataLogin, { headers: { "Content-Type": "application/json", "Accept": "application/json" } })
                .then(r => {
                    var token = r.data.Token;
                    var uhs = r.data.DisplayClaims.xui[0].uhs;
                    const dataXSTS = {
                        Properties: {
                            SandboxId: "RETAIL",
                            UserTokens: [token]
                        },
                        RelyingParty: "rp://api.minecraftservices.com/",
                        TokenType: "JWT"
                    };
                    axios.post("https://xsts.auth.xboxlive.com/xsts/authorize", dataXSTS, { headers: { "Content-Type": "application/json", "Accept": "application/json" } })
                        .then(xsts => {
                            const dataBearerMC = {
                                identityToken: "XBL3.0 x=" + uhs + ";" + xsts.data.Token,
                                ensureLegacyEnabled: true
                            };
                            axios.post("https://api.minecraftservices.com/authentication/login_with_xbox", dataBearerMC, {})
                                .then(acc => {
                                    axios.get("https://api.minecraftservices.com/minecraft/profile", { headers: { "Accept": "application/json", "Authorization": "Bearer " + acc.data.access_token } })
                                        .then(async mc => {
                                            var a = false;
                                            await verifUser(mc.data.selectedProfile.id).then(() => a = true).catch(() => a = false);
                                            res({ auth: acc.data, user: mc.data, refreshToken: auth.refresh_token, discordLinked: a });
                                        }).catch(err => rej(err.response.data));
                                }).catch(err => rej(err.response.data));
                        }).catch(err => {
                            if (err.response.status == 401) rej({ error: "NoMinecraftAccount", errorMessage: "no-message" });
                            else rej(err.response.data);
                        });
                }).catch(err => rej(err.response.data));
        }).catch(err => rej(err.response.data));
    });
}

function refresh(refreshToken) {
    return new Promise((res, rej) => {
        auth("refresh", refreshToken).then(res).catch(rej);
    });
}

function validate(accessToken) {
    if(!accessToken) return false;
    if(jwt.decode(accessToken).exp * 1000 > new Date().getTime()) return true;
    else return false;
}

export function token(accessToken, refreshToken) {
    return new Promise((res, rej) => {
        if(validate(accessToken)) {
            res(true);
        }
        else {
            refresh(refreshToken).then(res).catch(rej);
        }
    });
}

function verifUser(uuid) {
    return new Promise((res, rej) => {
        if(!uuid) rej();
        db.collection("members-mc").findOne({uuid}).then(user => {
            /*
            _id
            discordID
            uuid
            date
            */
            axios.get("https://localhost:4001/requests/discord/member?id=" + user.discordID).then(user => {
                if(user) res();
                else rej();
            }).catch(() => rej());
        }).catch(() => {
            db.collection("members-mc").insertOne({_id: generateID(), discordID: undefined, uuid, date: new Date()});

            rej();
        });
    });
}