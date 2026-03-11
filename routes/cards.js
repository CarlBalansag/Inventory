const express = require('express'); //Express lets us create routes
const router = express.Router(); //Creates a mini router just for card routes
const control = require('../controllers/cardsController'); //Holds the create and delete controller functions
const catchAsync = require('../utils/catchAsync'); //Wraps async functions to catch errors automatically
const { requireAuth } = require('../middleware/auth'); //Middleware that blocks access if user is not logged in

router.post('/', requireAuth, catchAsync(control.create)); //POST / → create a new card (must be logged in)
router.delete('/:id', requireAuth, catchAsync(control.delete)); //DELETE /:id → delete a card by ID (must be logged in)

module.exports = router; //Export so app.js can mount this router
