const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

//holds all exported controller functions
const control = require('../controllers/authController');

//Wrapper to catch async function errors 
const catchAsync = require('../utils/catchAsync');

const registerRules = [
  body('username')
    .trim() //takes out white spaces from the beginning and the end
    .notEmpty() //make sure input is not blank
    .withMessage('Username is required.'), //error shown for rule fail
  body('email')
    .isEmail() //input must look like a real email
    .withMessage('Valid email is required.'), //error shown for rule fail
  body('password')
    .isLength({ min: 6 }) //must be 6 characters or more
    .withMessage('Password must be at least 6 characters.'), //error shown for rule fail
];

router.get('/register', control.getRegister);
router.post('/register', registerRules, catchAsync(control.postRegister));
router.get('/login', control.getLogin);
router.post('/login', control.postLogin);
router.get('/logout', control.getLogout);

module.exports = router;
