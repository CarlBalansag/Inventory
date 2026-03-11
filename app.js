require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const path = require('path');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const helmet = require('helmet');
const methodOverride = require('method-override');


//runs passport file, registers LocalStrategy, serialize and deserialize
require('./config/passport');

//creates express app
const app = express();

//Tell Express to trust Render's reverse proxy so secure cookies and session work on HTTPS
app.set('trust proxy', 1);

//Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

//Security headers for every response
app.use(helmet({ contentSecurityPolicy: false }));

//View engine process EJS files (enables layout)
app.engine('ejs', ejsMate);
//Lets ejs knwosn default file type for veiws is .ejs
app.set('view engine', 'ejs');
//lets express know where the views folder is at 
app.set('views', path.join(__dirname, 'views'));

//Body parsing to let request data be read in controller
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//to be able to let req.body have data without it would be empty 
app.use(methodOverride('_method'));


//Static files, make everything in the public folder static files
app.use(express.static(path.join(__dirname, 'public')));

//Creates a MongoDB-backed session store and dont update the session record more than once every 24 hours
const sessionStore = MongoStore
  .create({ mongoUrl: process.env.MONGODB_URI, touchAfter: 24 * 3600 });
  sessionStore.on('error', (err) => console.error('Session store error:', err.message));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      //Only send cookie over HTTPS in production (required for Render's proxy)
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

//Set up passport on every request
app.use(passport.initialize());

//tells passport to use session
app.use(passport.session());

//Enables flash messages
app.use(flash());

const Card = require('./models/Card');

// Global locals
app.use(async (req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.user || null;
  if (req.user) {
    res.locals.userCards = await Card.find({ user: req.user._id }).sort({ createdAt: 1 });
  } else {
    res.locals.userCards = [];
  }
  next();
});

//Routes
app.use('/', require('./routes/dashboard'));
app.use('/auth', require('./routes/auth'));
app.use('/items', require('./routes/items'));
app.use('/sales', require('./routes/sales'));
app.use('/cards', require('./routes/cards'));

//404 error
app.use((req, res) => {
  res.status(404).render('error', { title: '404 Not Found', message: 'Page not found.', status: 404 });
});

//Global error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err.stack);
  const status = err.status || 500;
  const message = err.message || 'Something went wrong.';
  res.status(status).render('error', { title: 'Error', message, status });
});

module.exports = app;
