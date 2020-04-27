const functions = require('firebase-functions')
const firebaseAdmin = require('firebase-admin')
const config = require('./config.js')
const Twit = require('twit')
const TrivYeah = require('./services/trivyeah')

var T = new Twit(config)
var Trivyeah = new TrivYeah({ tenantSlug:"hello@wtxtra.agency" })

firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.applicationDefault(),
    databaseURL: 'https://trivyeah-twitter-client.firebaseio.com'
});
var gameRepository = (firebaseAdmin.database().ref('games'))

const GAME_STATUS = {
    ACTIVE_GAME: {
        AWAITING_SYSTEM_ACTION: 'AWAITING_SYSTEM_ACTION',
        AWAITING_USER_ACTION: 'AWAITING_USER_ACTION'
    }
}

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

getNextQuestionTweet = (replyToTweetId, users, question, options) => {
    let phrases = [
        `Next question.`,
        `This one.`,
        `Another one.`,
        `Ready? Here's the next:` 
    ]

    let questionIntro = phrases[Math.floor(phrases.length * Math.random())]
    return {
        status: `@${users.join(' @')} ${questionIntro} ${question} Is it ${options.join('. ')}`,
        in_reply_to_status_id: String(replyToTweetId)
    }
}

updateGameQuestions = (gameRef) => {
    let randomize = (a,b) => {
        return Math.random() - 0.5
    }
    Trivyeah.initTenant(trivyeah => {
        trivyeah.getForm(2).then(response => {
            let questions = response.data.sections[0].questions.sort(randomize).splice(0,9)
            gameRef.update({
                questions: questions
            })
            return
        })
        .catch(error => console.log(error))
    })
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
        current_question: 0,
        status: GAME_STATUS.ACTIVE_GAME.AWAITING_SYSTEM_ACTION,
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
    console.log("Start New Game: Success. Games Started")
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
            return
        })
    })
})

isSubmittedAnswer = (tweet, game) => {
    switch (true) {
        case tweet.in_reply_to_status_id_str !== game.latest_tweet:
        case tweet.in_reply_to_user_id_str !== "1161210094710923264":
        case (! Object.keys(game.users).includes(tweet.user.screen_name) ):
            return false
        default:
            break;
    }
    return true
}

markAnswer = (answer, game) => {
    answer.text
    return true
}

exports.gamePlay = functions.pubsub.schedule('every 1 minutes').onRun((context) => {    
    gameRepository
        .on("child_added", snapshot => {
            let game = snapshot.val()
            console.log(game)
            if (game.status !== GAME_STATUS.ACTIVE_GAME.AWAITING_USER_ACTION && game.status !== GAME_STATUS.ACTIVE_GAME.AWAITING_SYSTEM_ACTION) {
                return
            }

            if (game.status === GAME_STATUS.ACTIVE_GAME.AWAITING_USER_ACTION) {
                //Check replies to see if correct answer
                T.get('statuses/mentions_timeline', (err, tweets) => {
                    if (err) {
                        console.log("Start New Game: Error fetching mentions")
                        console.log(err)
                        return
                    }
                    submittedAnswers = tweets.filter(tweet => isSubmittedAnswer(tweet, game))
                    for(const [index, answer] of submittedAnswers.entries()) {
                        if (markAnswer(answer, game)) {
                            break
                        }
                    }
                    return
                })
                return
            } else {
                labels = ['A', 'B', 'C', 'D', 'E', 'F']
                currentQuestion = game.questions[game.current_question]
                let options = currentQuestion.options.map((option, index) => {
                    return `${labels[index]}. ${option.text}`
                })
                let users = Object.keys(game.users)
                let tweetParams = getNextQuestionTweet(game.latest_tweet, users, currentQuestion.text, options)
                console.log(tweetParams)
                T.post('statuses/update', tweetParams, (err, data, response) => {
                    if (err) {
                        console.log("Start New Game: Error tweeting the game start")
                        console.log(err)
                        return
                    }
                    snapshot.ref.update({
                        latest_tweet: data.id_str,
                        status: "AWAITING_USER_ACTION"
                    })
                })

                return
            }
    })
    return 1;
})