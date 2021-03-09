const 
express = require('express'),
app = express(),
socket = require('socket.io'),
session = require('express-session'),
cookieParser = require("cookie-parser"),
mongoose = require('mongoose');

require('dotenv/config');

// Import Routes
const 
User_Routes = require('./routes/User_Routes'),
Login_Routes = require('./routes/Login_Routes'),
Logout_Routes = require('./routes/Logout_Routes'),
Board_Routes = require('./routes/Board_Routes'),
Desk_Routes = require('./routes/Desk_Routes'),
NotFound_Routes = require('./routes/404_Routes');

// Middleware
mongoose.set('useFindAndModify', false);
app.use(express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({ secret : process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));

/**
 * Check Status, Get and Save User Data (Middleware)
 * 
 * kontrolliert den User status und speichert user daten in das session objekt
 * .) ist der session cookie & session data vorhanden wird die middleware übersprungen
 * .) ist nur der session cookie vorhanden wird damit der passende user in der Datenbank gesucht
 *    wird kein User gefunden (zB. wegen falscher cookieID) wird der cookie gelöscht und session data zurückgesetzt
 *    ansonsten speichere die nötigen user daten in das session objekt
 */
const User = require('./models/User');
app.use(getUserDataLocal);
async function getUserDataLocal(req, res, next){
    if(req.cookies._taskID && req.session.currentUser){
        next();
    }
    else{
        if(req.cookies._taskID){
            const user = await User.findOne({sessionid: req.cookies._taskID}, (err, found) => {
                if(err){
                    req.clearCookie('_taskID');
                    next();
                };
            }).select('-password');
            if(user == null){
                req.session.currentUser = undefined;
                res.clearCookie('_taskID');
            }
            else{
                req.session.currentUser = user;
            }
            next();
        }
        else{
            next();
        }
    }
};

// ROUTING
app.use('/login', Login_Routes);
app.use('/user', User_Routes);
app.use('/board', Board_Routes);
app.use('/desk', Desk_Routes);
app.use('/logout', Logout_Routes);
app.use('/*?', NotFound_Routes);

// PORT & DB Connection
const PORT = process.env.PORT || 5400;
const server = app.listen(PORT);
mongoose.connect(
    process.env.DB_CONNECTION, {useNewUrlParser: true, useUnifiedTopology: true}, () => {
        console.log('DB Connected');
    }
);

const io = socket(server);

io.on('connection', socket => {       // hier landen ALLE user sockets

    // console.log('new client connected', socket.id);

    socket.on('chat-send', msg => {

        // io.emit('chat-receive', msg);   // send to all connected sockets      
        socket.broadcast.emit('chat-receive', msg); // send to all connected sockets except mine

        //## Session object verwenden SENDE UND checke CURRENT DESK
        //## Speichere bei connect die ID in session object und suche dadurch
    });

    socket.on('chat-here', data => {

        socket.broadcast.emit('chat-otherHere', data);
        
    });

    socket.on('disconnect', ()=>{     // at socket disconnect

    });
});