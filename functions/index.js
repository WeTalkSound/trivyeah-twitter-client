const functions = require('firebase-functions')
const firebaseAdmin = require('firebase-admin')
const config = require('./config.js')
const Twit = require('twit')
const TrivYeah = require('../services/trivyeah')
const FireRepo = require('../services/firebase-repo')

var T = new Twit(config)
// var trivyeah = new TrivYeah({ tenant_key:"app" })

firebaseAdmin.initializeApp(functions.config().firebase);
// // var gameRepository = new FireRepo(firebaseAdmin.database().ref('games'))
var gameRepository = (firebaseAdmin.database().ref('games'))

isNewGameRequest = (tweet) => {
    switch (true) {
        case Boolean(tweet.in_reply_to_status_id_str):
        case tweet.in_reply_to_user_id_str !== "1161210094710923264":
            return false
        default:
            break;
    }
    return true
}

parseUserNames = (tweet) => {
    let userNames = tweet.entities.user_mentions.map(user => user.screen_name)
    return userNames
}

startNewGame = (gameRequest) => {
    let phrases = [
        `Awesome! Let's begin the game then! I'll ask a question with options and the first reply with the correct option wins`,
        `Let the games begin! Reply my question with the correct option to win!`
    ]

    let gameStartPhrase = phrases[Math.floor(phrases.length * Math.random())]
    let params = {
        status: `@${gameRequest.user.screen_name} ${gameStartPhrase}`,
        in_reply_to_status_id: '' + gameRequest.id_str
    }

    T.post('statuses/update', params, (error, data, response) => {
        console.log(data)
    })

    let userNames = parseUserNames(gameRequest)

    let users = {}

    userNames.forEach(userName => {
        users[userName] = 0
    })

    gameRepository.set({
        [gameRequest.id_str]: {
            latest_tweet: [gameRequest.id_str],
            users: [users]
        }, 
    })
}

exports.duplicateSNG = functions.https.onRequest((request, response) => {
    T.get('statuses/mentions_timeline', (err, tweets) => {
        newGameRequests = tweets.filter(tweet => isNewGameRequest(tweet))
        newGameRequests.forEach(gameRequest => {
            startNewGame(gameRequest)
        });
        response.send(newGameRequests)
    })
})

exports.startNewGame = functions.pubsub.schedule('every 1 minute').onRun((context) => {
    gameRepository.first()
    T.get('statuses/mentions_timeline')
})