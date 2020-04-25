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

getGameStartTweet = (replyToTweetId, users) => {
    let phrases = [
        `Awesome! Let's begin the game then! I'll ask a question with options and the first reply with the correct option wins`,
        `Let the games begin! Reply my question with the correct option to win!`
    ]

    let gameStartPhrase = phrases[Math.floor(phrases.length * Math.random())]
    return {
        status: `@${users.join(' @')} ${gameStartPhrase}`,
        in_reply_to_status_id: String(replyToTweetId)
    }
}

updateGameQuestions = (gameRef) => {
    let randomize = (a,b) => {
        return Math.random() - 0.5
    }
    trivyeah.getForm(2).then(response => {
        let questions = response.data.sections[0].questions.sort(randomize).splice(0,9)
        gameRef.update({
            questions: questions
        })
    })
    .catch(error => console.log(error))
}

startNewGame = (gameRequest) => {
    let userNames = parseUserNames(gameRequest)

    let params = getGameStartTweet(gameRequest.id_str, userNames)
    
    let users = {}
    
    userNames.forEach(userName => {
        users[userName] = 0
    })
    
    var newGameRef = gameRepository.push()
    newGameRef.set({
        start_tweet: gameRequest.id_str,
        latest_tweet: gameRequest.id_str,
        current_quesion: 0,
        status: "AWAITING_USER_ACTION",
        users: users,
    })

    T.post('statuses/update', params, (err, data, response) => {
        if (err) {
            console.log("Start New Game: Error tweeting the game start")
            console.log(err)
            return
        }
        newGameRef.update({
            latest_tweet: data.id_str
        })
    })
    updateGameQuestions(newGameRef)
}

exports.startNewGame = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
    gameRepository.once("value", snapshot => {
        let data = snapshot.val()
        let activeGames = data ? Object.values(data).map(game => game.start_tweet) : []
        T.get('statuses/mentions_timeline', (err, tweets) => {
            if (err) {
                console.log("Start New Game: Error fetching mentions")
                console.log(err)
                return
            }
            newGameRequests = tweets.filter(tweet => isNewGameRequest(tweet, activeGames))
            newGameRequests.forEach(gameRequest => {
                startNewGame(gameRequest)
            })
            console.log("Start New Game: Success. Games Started")
            return 1;
        })
    })
})

exports.gamePlay = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
    gameRepository.once("value", snapshot => {
        let games = snapshot.val()

        games.forEach(game => {
            if (game.status === "AWAITING_USER_ACTION") {
                //Check replies to see if correct answer
                return;
            } else {
                //Ask next question and increment currentQuestion
            }
        });
    })
    return 1;
})