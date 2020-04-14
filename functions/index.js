const functions = require('firebase-functions')
const firebaseAdmin = require('firebase-admin')
const config = require('./config.js')
const Twit = require('twit')
const TrivYeah = require('../services/trivyeah')
const FireRepo = require('../services/firebase-repo')

var T = new Twit(config)
// var trivyeah = new TrivYeah({ tenant_key:"app" })

firebaseAdmin.initializeApp(functions.config().firebase);
// var gameRepository = new FireRepo(firebaseAdmin.database().ref('games'))
var gameRepository = (firebaseAdmin.database().ref('games'))

exports.duplicateSNG = functions.https.onRequest((request, response) => {
    let first = {a:3}
    gameRepository.on("value", async function (snapshot) {
        first = console.log(snapshot.val())
    })
    T.get('statuses/mentions_timeline')
    console.log(first)
    response.send(first)
})

exports.startNewGame = functions.pubsub.schedule('every 1 minute').onRun((context) => {
    gameRepository.first()
    T.get('statuses/mentions_timeline')
})