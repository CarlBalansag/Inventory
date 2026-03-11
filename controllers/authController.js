const { validationResult } = require('express-validator');
const User = require('../models/User');

exports.getRegister = (req, res) => {
  res.render('auth/register', 
    { title: 'Register', 
      errors: [], 
      old: {} 
    }
  );
};

exports.postRegister = async (req, res) => {
  const errors = validationResult(req); //Checks if routes find any problems
  if (!errors.isEmpty()) { //error is found
    return res.render('auth/register', {
      title: 'Register',
      errors: errors.array(),
      old: req.body,
    });
  }

  //If there are no errors pulls these 3 data out the req.body
  const { username, email, password } = req.body;

  //Checks if data is already in the Database
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    return res.render('auth/register', {
      title: 'Register',
      errors: [{ msg: 'Email or username already in use.' }],
      old: req.body,
    });
  }

  //data is not in the database creates a new user saves object into the Database
  const user = new User({ username, email, password });
  await user.save();
  req.flash('success', 'Account created! Please log in.');
  res.redirect('/auth/login');
};

exports.getLogin = (req, res) => {
  res.render('auth/login', 
    { title: 'Login', 
      errors: [], 
      old: {} 
    }
  );
};

exports.postLogin = (req, res, next) => {
  const passport = require('passport');
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err); //if there is a server error
    if (!user) { //user is false when logging in
      req.flash('error', (info && info.message) || 'Invalid credentials.');
      return res.redirect('/auth/login');
    }
    req.logIn(user, (loginErr) => { //Only gets here if user is not false and login is success
      if (loginErr) return next(loginErr);
      res.redirect('/');
    });
  })(req, res, next);
};

exports.getLogout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success', 'Logged out successfully.');
    res.redirect('/auth/login');
  });
};
