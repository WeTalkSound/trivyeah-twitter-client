const functions = require('firebase-functions')
const firebaseAdmin = require('firebase-admin')
const config = require('./config.js')
var Twit = require('twit')
 
var T = new Twit(config)