const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy; //a way to store on local database
const User = require('../models/User'); //Query MongoDB Users

passport.use(
  //Default strategy looks for username, tell to use email instead
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      //searches database with a user with input email
      const user = await User.findOne({ email });

      //if user is not in the database call done false
      if (!user) return done(null, false, { message: 'No account with that email.' });
      
      //hashes the submitted password and comapares to stored hash
      const valid = await user.comparePassword(password);
      
      //if password didn't match tell passport login failed
      if (!valid) return done(null, false, { message: 'Incorrect password.' });
      
      //Everything went through, pass user object to passport
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

//after a succesfull log in, passport needs to store id into a cookie to remember the log in user request
passport.serializeUser((user, done) => done(null, user._id));

//Passport reads _id from session cookie and runs this function, Looks up full user from the database and attaches to req.user, making req.user available everywhere
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});
