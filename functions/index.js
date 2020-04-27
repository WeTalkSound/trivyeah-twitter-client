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
    },
    GAME_OVER: 'GAME_OVER'
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

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

getCorrectAnswerTweet = (replyToTweetId, users) => {
    let phrases = [
        `That's Right! This is the right answer`,
        `Ding ding ding. A Winner!`,
        `Exactly! Got it in one.`,
        `Well, you know your stuff!` 
    ]

    let phrase = phrases[Math.floor(phrases.length * Math.random())]
    return {
        status: `@${users.join(' @')} ${phrase} Get ready for the next one!`,
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

getGameOverTweet = (replyToTweetId, users, ranking) => {
    let phrases = [
        `That's all folks.`,
        `It's over!`,
        `Victory for some, defeat for others`,
        `Ah. All good must come to an end.` 
    ]

    let phrase = phrases[Math.floor(phrases.length * Math.random())]

    let entries = Object.entries(ranking);
    
    let sorted = entries.sort((a, b) => a[1] - b[1]);
    ranking = sorted.map(ranking => ranking.join(" - "))

    return {
        status: `@${users.join(' @')} ${phrase} Here are the rankings: \n${ranking.join('\n')}`,
        in_reply_to_status_id: String(replyToTweetId)
    }
}

isCorrrectAnswer = (answer, game) => {
    let optionSelected = answer.text.toUpperCase().charAt(answer.text.length - 1)
    let optionIndex = OPTION_LABELS.indexOf(optionSelected)
    if(optionIndex !== -1) {
        if(game.questions[game.current_question].options[optionIndex].value === 1){
            return true
        }
    }
    return false
}

exports.gamePlay = functions.pubsub.schedule('every 1 minutes').onRun((context) => {    
    gameRepository
        .on("child_added", snapshot => {
            let game = snapshot.val()
            if (game.status !== GAME_STATUS.ACTIVE_GAME.AWAITING_USER_ACTION && game.status !== GAME_STATUS.ACTIVE_GAME.AWAITING_SYSTEM_ACTION) {
                return
            }

            if (game.status === GAME_STATUS.ACTIVE_GAME.AWAITING_USER_ACTION) {
                //Check replies to see if correct answer
                T.get('statuses/mentions_timeline', (err, tweets) => {
                    if (err) {
                        console.log("Game Play: Error fetching mentions")
                        console.log(err)
                        return
                    }
                    //API returns newest first. Older answers should get a chance first.
                    submittedAnswers = tweets.reverse().filter(tweet => isSubmittedAnswer(tweet, game))
                    for(const [index, answer] of submittedAnswers.entries()) {
                        if (isCorrrectAnswer(answer, game)) {
                            users = game.users
                            currentQuestion = game.current_question + 1
                            users[answer.user.screen_name] += 1
                            snapshot.ref.update({
                                users: users,
                                current_question: currentQuestion
                            })
                            let tweetParams = getCorrectAnswerTweet(answer.id_str, Object.keys(users))
                            T.post('statuses/update', tweetParams, (err, data, response) => {
                                if (err) {
                                    console.log("Game Play: Error tweeting correct answer")
                                    console.log(err)
                                    return
                                }
                                snapshot.ref.update({
                                    latest_tweet: data.id_str,
                                    status: "AWAITING_SYSTEM_ACTION"
                                })
                            })
                            break
                        }
                    }
                    return
                })
                return
            } else {
                if (game.current_question >= game.questions.length) {
                    console.log("Game Play: Game Over. Determine Winners")
                    let tweetParams = getGameOverTweet(game.latest_tweet, Object.keys(game.users), game.users)
                    T.post('statuses/update', tweetParams, (err, data, response) => {
                        if (err) {
                            console.log("Game Play: Error tweeting winner")
                            console.log(err)
                            return
                        }
                        snapshot.ref.update({
                            latest_tweet: data.id_str,
                            status: GAME_STATUS.GAME_OVER
                        })
                    })
                }
                currentQuestion = game.questions[game.current_question]
                let options = currentQuestion.options.map((option, index) => {
                    return `${OPTION_LABELS[index]}. ${option.text}`
                })
                let users = Object.keys(game.users)
                let tweetParams = getNextQuestionTweet(game.latest_tweet, users, currentQuestion.text, options)
                T.post('statuses/update', tweetParams, (err, data, response) => {
                    if (err) {
                        console.log("Game Play: Error tweeting next question")
                        console.log(err)
                        return
                    }
                    snapshot.ref.update({
                        latest_tweet: data.id_str,
                        status: GAME_STATUS.ACTIVE_GAME.AWAITING_USER_ACTION
                    })
                })

                return
            }
    })
    return 1;
})