const express = require('express'); //Express lets us create routes
const router = express.Router(); //Creates a mini router just for the dashboard route
const control = require('../controllers/dashboardController'); //Holds the getDashboard controller function
const catchAsync = require('../utils/catchAsync'); //Wraps async functions to catch errors automatically
const { requireAuth } = require('../middleware/auth'); //Middleware that blocks access if user is not logged in

router.get('/', requireAuth, catchAsync(control.getDashboard)); //GET / → load the dashboard (must be logged in)

module.exports = router; //Export so app.js can mount this router
