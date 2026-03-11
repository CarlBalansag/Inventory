const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/salesController');
const catchAsync = require('../utils/catchAsync');
const { requireAuth } = require('../middleware/auth');

const saleRules = [ //Creating sales
  body('item')
    .notEmpty()
    .withMessage('Item is required.'),
  body('salePrice')
    .isFloat({ min: 0 })
    .withMessage('Sale price must be a positive number.'),
  body('quantitySold')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1.'),
  body('saleDate')
    .isDate()
    .withMessage('Sale date is required.'),
  body('platformSold')
    .trim()
    .notEmpty()
    .withMessage('Platform is required.'),
];

const updateRules = [ //Editing Sales
  body('salePrice')
    .isFloat({ min: 0 })
    .withMessage('Sale price must be a positive number.'),
  body('saleDate')
    .isDate()
    .withMessage('Sale date is required.'),
  body('platformSold')
    .trim()
    .notEmpty()
    .withMessage('Platform is required.'),
];

router.get('/', requireAuth, catchAsync(ctrl.index));
router.get('/new', requireAuth, catchAsync(ctrl.newForm));
router.post('/', requireAuth, saleRules, catchAsync(ctrl.create));
router.get('/:id', requireAuth, catchAsync(ctrl.show));
router.get('/:id/edit', requireAuth, catchAsync(ctrl.editForm));
router.put('/:id', requireAuth, updateRules, catchAsync(ctrl.update));
router.delete('/:id', requireAuth, catchAsync(ctrl.delete));

module.exports = router;
