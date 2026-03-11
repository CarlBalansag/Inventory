const express = require('express'); //Express lets us create routes
const router = express.Router(); //Creates a mini router just for item routes
const { body } = require('express-validator'); //body() lets us write validation rules for form fields
const control = require('../controllers/itemsController'); //Holds all item controller functions
const catchAsync = require('../utils/catchAsync'); //Wraps async functions to catch errors automatically
const { requireAuth } = require('../middleware/auth'); //Middleware that blocks access if user is not logged in


const itemRules = [ //Validation rules that run before creating or updating an item

  body('name')
    .trim() //Remove whitespace from both ends
    .notEmpty() //Can't be blank
    .withMessage('Name is required.'), //Error message if blank

  body('purchasePrice')
    .isFloat({ min: 0 }) //Must be a number, 0 or higher
    .withMessage('Purchase price must be a positive number.'), //Error message if invalid

  body('purchaseDate')
    .isDate() //Must be a valid date
    .withMessage('Purchase date is required.'), //Error message if invalid

  body('platformBought')
    .trim() //Remove whitespace
    .notEmpty() //Can't be blank
    .withMessage('Platform is required.'), //Error message if blank

  body('quantity')
    .optional() //Not required
    .isInt({ min: 1 }) //If provided, must be a whole number of at least 1
    .withMessage('Quantity must be at least 1.'), //Error message if invalid

  body('tax')
    .optional() //Not required
    .isFloat({ min: 0 }) //If provided, must be 0 or higher
    .withMessage('Tax must be a positive number.'), //Error message if invalid

  body('purchaseLink')
    .optional({ checkFalsy: true }) //Not required, and skip if empty string
    .isURL()
    .withMessage('Purchase link must be a valid URL.'), //If provided, must be a real URL

];


router.get('/',        requireAuth, catchAsync(control.index));   //GET /        → show all items list
router.get('/new',     requireAuth, control.newForm);              //GET /new     → show the add item form
router.post('/',       requireAuth, itemRules, catchAsync(control.create));  //POST /       → submit the add item form
router.get('/:id',     requireAuth, catchAsync(control.show));    //GET /:id     → show a single item's details
router.get('/:id/edit',requireAuth, catchAsync(control.editForm)); //GET /:id/edit → show the edit form for an item
router.put('/:id',     requireAuth, itemRules, catchAsync(control.update));  //PUT /:id     → submit the edit form
router.delete('/:id',  requireAuth, catchAsync(control.delete));  //DELETE /:id  → delete an item by ID


module.exports = router; //Export so app.js can mount this router
