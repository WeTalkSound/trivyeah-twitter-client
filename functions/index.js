const functions = require('firebase-functions')
const firebaseAdmin = require('firebase-admin')
const config = require('./config.js')
const Twit = require('twit')
const TrivYeah = require('./services/trivyeah')

var T = new Twit(config)
var trivyeah = new TrivYeah({ tenantSlug:"hello@wtxtra.agency" })

firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.applicationDefault(),
    databaseURL: 'https://trivyeah-twitter-client.firebaseio.com'
});
// // var gameRepository = new FireRepo(firebaseAdmin.database().ref('games'))
var gameRepository = (firebaseAdmin.database().ref('games'))

isNewGameRequest = (tweet, activeGames) => {
    switch (true) {
        case Boolean(tweet.in_reply_to_status_id_str):
        case tweet.in_reply_to_user_id_str !== "1161210094710923264":
        case !(tweet.text.toLowerCase().includes('new game')):
        case activeGames.includes(tweet.id_str):
            return false
        default:
            break;
    }
    return true
}

parseUserNames = (tweet) => {
    let userNames = tweet.entities.user_mentions.filter(user => user.id_str !== "1161210094710923264").map(user => user.screen_name)
    userNames.unshift(tweet.user.screen_name)
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
        in_reply_to_status_id: String(gameRequest.id_str)
    }
    
    let userNames = parseUserNames(gameRequest)
    
    let users = {}
    
    userNames.forEach(userName => {
        users[userName] = 0
    })
    
    var newGameRef = gameRepository.push()
    console.log(newGameRef)
    newGameRef.set({
        start_tweet: gameRequest.id_str,
        latest_tweet: gameRequest.id_str,
        current_quesion: 0,
        users: users,
    })

    T.post('statuses/update', params, (err, data, response) => {
        if (err) {
            console.log("There was an error tweeting the game start")
            return
        }
        gameRepository.child(newGameRef.key).update({
            latest_tweet: data.id_str
        })
    })
}

exports.duplicateSNG = functions.https.onRequest((request, response) => {
    gameRepository.once("value", snapshot => {
        let data = snapshot.val()
        let activeGames = data ? Object.values(data).map(game => game.start_tweet) : []
        T.get('statuses/mentions_timeline', (err, tweets) => {
            if (err) {
                return
            }
            newGameRequests = tweets.filter(tweet => isNewGameRequest(tweet, activeGames))
            newGameRequests.forEach(gameRequest => {
                startNewGame(gameRequest)
            })
            response.send(newGameRequests)
        })
        // console.log(activeGames)
        // response.send(activeGames)
    })
})

// exports.startNewGame = functions.pubsub.schedule('every 1 minute').onRun((context) => {
//     gameRepository.first()
//     T.get('statuses/mentions_timeline')
// })