const mongo = require("mongodb");
const MongoClient = mongo.MongoClient;

/**
 * @type {mongo.Db}
 */
var dbCache;

var listeners = [];

function getDB(callback) {
    if(dbCache) callback(dbCache);
    else listeners.push(callback);
}

module.exports.getDB = getDB;

MongoClient.connect(process.env.DB, function (err, client) {
    if(err) return rej(err);

    console.log("Connected successfully to mongodb");
    dbCache = client.db(process.env.DB_NAME);

    listeners.forEach(l => l(dbCache));
    listeners = [];
});