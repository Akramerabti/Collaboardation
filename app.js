const express = require("express");
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const nodemailer = require('nodemailer');
const authRoutes = require("./routes/authroutes");
const mongoose = require("mongoose");
const { requireAuth,checkUser } = require("./middleware/authMiddleware");
const cookieParser = require('cookie-parser');
const bodyparser = require('body-parser');
const path = require('path');
const User = require("./models/User");
const PORT = process.env.PORT || 3000;
const jwt = require("jsonwebtoken")
const {
  getActiveUser,
  exitRoom,
  newUser,
  getIndividualRoomUsers
} = require("./controllers/roomusers")
const formatMessage = require("./controllers/messages")
const message = require("./models/messages")



/*assuming an express app is declared here*/
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io-client/dist'));
app.use(cookieParser());
app.use(authRoutes);

app.use(express.static(path.join(__dirname, '/public')));
app.use(express.json());
app.set('view engine', "ejs"); //Setting the "view engine" name default by express.js as "hbs"

const dbURI = 'mongodb+srv://Akramvd:lF9UjtVXF0iWsxetr2MK@cluster0.7wctpqm.mongodb.net/appdatabase';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Main server and Socket.io on port ${PORT}`);
    });
  })
  .catch((err) => console.log(err));
      //ERROR I DON<T KNOW WHY BUT IN AUTHMIDDLEWARE USER IS NOT FOUND LAST ERROR OF PROJECT --------- >
    

      app.use((req, res, next) => {
        if (req.path !== '/login') {
          checkUser(req, res, next);
        } else {
          next(); // Skip checkUser for the login page
        }
      });


app.use("*", checkUser) //when you write just local host 3000, sets up the main location in the templates folder to be ... the thing below (res.render), which is home

app.get('/', (req,res) => {//when you write just local host 3000, sets up the main location in the templates folder to be ... the thing below (res.render), which is home
    res.render('home'); //FETCHES HOME FILE IN PUBLIC FOLDER
}) 

app.get("/chat", requireAuth, (req, res) => {
  const user = res.locals.user;
  console.log(user)
  res.render(path.join(__dirname, 'public', 'chat'), {user});
});

// Serve the rooms.ejs file
app.get("/rooms", requireAuth, (req, res) => {
  const user = res.locals.user;
  console.log(user)
  res.render(path.join(__dirname, 'public', 'rooms'), {user});
});

app.get("/personalchat", requireAuth, (req, res) => {
  const user = res.locals.user;
  console.log(user)
  res.render(path.join(__dirname, 'public', 'personalchat'), {user});
});

app.get("/personal", requireAuth, (req, res) => {
  const user = res.locals.user;
  console.log(user)
  res.render(path.join(__dirname, 'public', 'personal'), {user});
});


//On connection for the public collaboardation
io.on('connection', socket => {
  
 

  socket.on('joinRoom', ({ username, room }) => {

     
    

    const user = newUser(socket.id, username, room);

    socket.join(user.room);

    // General welcome
    socket.emit('message', formatMessage("Captain Collab", ' Keep it clean and enjoy! '));

    // Broadcast everytime users connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage("Captain Collaboard", `${user.username} has joined the room`)
      );

    // Current active users and room name
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getIndividualRoomUsers(user.room)
    });
    
    // Listen for client message
    const sentMessages = new Set();

    socket.on('chatMessage', ({ msg, sender }) => {
      const user = getActiveUser(socket.id);
    
      // Check if the user's socket ID is in the Set
      if (!sentMessages.has(socket.id)) {
        // If not, send the message and add their socket ID to the Set
        io.to(user.room).emit('message', formatMessage({ sender, msg }));
        sentMessages.add(socket.id);
      }
    
      // Continue with your other logic (saving the message, fetching messages, etc.)
      const newmessage = new message({ msg, sender });
      newmessage.save().then(() => {
        // After saving the message, fetch and emit all messages
        message.find().then((result) => {
          io.emit("messages", result);
          console.log(result);
        });
      });
    });
 
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = exitRoom(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage("WebCage", `${user.username} has left the room`)
      );

      // Current active users and room name
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getIndividualRoomUsers(user.room)
      });
    }
  });
});




// COOKIES DEF : stores data of browser then is sent back to server and we can access it, cookie holds jwt token to identify user
//const cookieParser = require('cookie-parser');
//app.use(cookieParser());

//app.get('/set-cookies', (req, res) => { // Creates a cookie

  // to create value from database as cookie until session is closed:  OR res.setHeader('Set-Cookie', 'newUser=true');
  
  //es.cookie('newUser', false); // creating new cookie newUser variable and setting to false 
  //res.cookie('isEmployee', true, { maxAge: 1000 * 60 * 60 * 24, httpOnly: true }); //new cookies with properties (maxAge is the time of the value in the session, the # are in ms, this is one day, so it expires after a day  )
  // can use "secure" property object for it to be present only in https
  //httpOnly means it is inaccessible via javascript, so just transferable via http protocol not java front end

  //res.send('you got the cookies!');

//app.get('/read-cookies', (req, res) => {

  //const cookies = req.cookies;
 // console.log(cookies.newUser); // gets the value of the cookie newUser

  //res.json(cookies); // passes it as json to the browser isEmployee we can see it as well.