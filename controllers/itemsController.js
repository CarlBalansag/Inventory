const { validationResult } = require('express-validator'); //Checks for validation errors from the routes
const Item = require('../models/Item'); //Item model for database queries
const Sale = require('../models/Sale'); //Sale model for tracking how many were sold
const Card = require('../models/Card'); //Card model to populate card dropdown on forms


exports.index = async (req, res) => {

  const { search, sort, filter, page = 1, limit = 10 } = req.query; //Pulls search, sort, filter, and pagination values from the URL

  const query = { user: req.user._id }; //only get items belonging to the logged in user

  if (search) query.name = { $regex: search, $options: 'i' }; //filter items whose name matches
  if (filter === 'sold') query.isSold = true; //Filter to only sold items
  if (filter === 'unsold') query.isSold = false; //Filter to only unsold items

  let sortObj = { createdAt: -1 }; //sort newest first
  if (sort === 'purchaseDate') sortObj = { purchaseDate: -1 }; //Sort by purchase date if selected
  if (sort === 'purchasePrice') sortObj = { purchasePrice: -1 }; //Sort by purchase price if selected

  const skip = (parseInt(page) - 1) * parseInt(limit); //Calculate how many items to skip for pagination

  const [items, total] = await Promise.all([
    Item.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit)), //Fetch the current page of items
    Item.countDocuments(query), //Count total matching items for pagination math
  ]);

  //Count sales per item to find quantity available
  const itemIds = items.map((i) => i._id); //Pull out the IDs of current page of items

  const salesCounts = await Sale.aggregate([
    { $match: { item: { $in: itemIds } } }, //look at sales for items on this page
    { $group: { _id: '$item', count: { $sum: 1 } } }, //Group by item and count how many sales each has
  ]);

  const salesByItem = {}; //store sale counts keyed by item ID
  for (const s of salesCounts) salesByItem[s._id.toString()] = s.count; //Fill object with item ID, sale count

  const itemsWithCalc = items.map((item) => {
    const sold = salesByItem[item._id.toString()] || 0; //how many of this item have been sold 
    const qty = item.quantity || 1; //quantity

    return {
      ...item.toObject(), //item fields into a plain object
      _id: item._id, //Keep the item ID
      quantityAvailable: Math.max(0, qty - sold), //How many are left
      totalCost: (item.purchasePrice * qty) + (item.tax || 0), //Total cost = (price × qty) + tax
    };
  });

  const totalPages = Math.ceil(total / parseInt(limit));

  res.render('items/index', {
    title: 'Inventory',
    items: itemsWithCalc, //Calculated items passed to the view
    search: search || '', //Pass search term back to keep input filled
    sort: sort || '', //Pass sort value back to the view
    filter: filter || '', //Pass filter back to the view
    page: parseInt(page), //Current page number
    totalPages, //Total pages for pagination controls
  });

};


exports.newForm = async (req, res) => {

  const userCards = await Card.find({ user: req.user._id }).sort({ createdAt: 1 }); //Get all cards for the logged in user for the dropdown

  res.render('items/new', { title: 'Add Item', errors: [], old: {}, userCards }); //Render the add item form

};


exports.create = async (req, res) => {

  const errors = validationResult(req); //Check if any validation rules from the route failed

  if (!errors.isEmpty()) {
    const userCards = await Card.find({ user: req.user._id }).sort({ createdAt: 1 }); //Re-fetch cards to re-render form
    return res.render('items/new', { title: 'Add Item', errors: errors.array(), old: req.body, userCards }); //Re-render form with errors and old input
  }

  const {
    name, category, purchasePrice, purchaseDate,
    platformBought, condition, quantity, tax,
    cardUsed, purchaseLink, notes, tags
  } = req.body; //Pull all form fields from request body

  const tagsArr = tags
    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
    : []; //Split tags by comma, trim whitespace, remove empty strings

  const item = new Item({
    user: req.user._id,
    name,
    category,
    purchasePrice,
    purchaseDate,
    platformBought,
    condition,
    quantity: quantity || 1,
    tax: tax || 0,
    cardUsed,
    purchaseLink,
    notes,
    tags: tagsArr,
  }); //Create new item linked to logged in user

  await item.save(); //Save the new item to the database
  req.flash('success', 'Item added to inventory.'); //Show success message
  res.redirect('/items'); //Redirect back to the items list

};


exports.show = async (req, res) => {

  const item = await Item.findById(req.params.id); //Find item by ID from the URL

  if (!item) {
    req.flash('error', 'Item not found.');
    return res.redirect('/items'); //If item doesn't exist, flash error and redirect
  }

  if (!item.user.equals(req.user._id))
    return res.status(403).render('error', { title: 'Forbidden', message: 'Access denied.', status: 403 }); //Block access if item doesn't belong to the logged in user

  res.render('items/show', { title: item.name, item }); //Render the item detail page

};


exports.editForm = async (req, res) => {

  const [item, userCards] = await Promise.all([
    Item.findById(req.params.id), //Find item by ID
    Card.find({ user: req.user._id }).sort({ createdAt: 1 }), //Get cards for dropdown
  ]);

  if (!item) {
    req.flash('error', 'Item not found.');
    return res.redirect('/items'); //Item not found
  }

  if (!item.user.equals(req.user._id))
    return res.status(403).render('error', { title: 'Forbidden', message: 'Access denied.', status: 403 }); //Not the owner

  res.render('items/edit', { title: 'Edit Item', item, errors: [], old: item, userCards }); //Render edit form with current item data

};


exports.update = async (req, res) => {

  const errors = validationResult(req); //Check validation

  const [item, userCards] = await Promise.all([
    Item.findById(req.params.id), //Find the item to update
    Card.find({ user: req.user._id }).sort({ createdAt: 1 }), //Get cards for dropdown
  ]);

  if (!item) {
    req.flash('error', 'Item not found.');
    return res.redirect('/items'); //Item not found
  }

  if (!item.user.equals(req.user._id))
    return res.status(403).render('error', { title: 'Forbidden', message: 'Access denied.', status: 403 }); //Block if not owner

  if (!errors.isEmpty()) {
    return res.render('items/edit', { title: 'Edit Item', item, errors: errors.array(), old: req.body, userCards }); //Re-render with errors
  }

  const {
    name, category, purchasePrice, purchaseDate,
    platformBought, condition, quantity, tax,
    cardUsed, purchaseLink, notes, tags
  } = req.body; //Pull updated fields from request body

  const tagsArr = tags
    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
    : []; //Process tags same as create

  Object.assign(item, {
    name,
    category,
    purchasePrice,
    purchaseDate,
    platformBought,
    condition,
    quantity: quantity || 1,
    tax: tax || 0,
    cardUsed,
    purchaseLink,
    notes,
    tags: tagsArr,
  }); //Update item fields in place

  await item.save(); //Save changes to database
  req.flash('success', 'Item updated.'); //Flash success message
  res.redirect(`/items/${item._id}`); //Redirect to the item detail page

};


exports.delete = async (req, res) => {

  const item = await Item.findById(req.params.id); //Find item by ID

  if (!item) {
    req.flash('error', 'Item not found.');
    return res.redirect('/items'); //Item not found
  }

  if (!item.user.equals(req.user._id))
    return res.status(403).render('error', { title: 'Forbidden', message: 'Access denied.', status: 403 }); //Block if not owner

  await item.deleteOne(); //Delete the item from the database
  req.flash('success', 'Item deleted.'); //Flash success message
  res.redirect('/items'); //Redirect back to items list

};
