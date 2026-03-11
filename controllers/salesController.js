const { validationResult } = require('express-validator');
const Sale = require('../models/Sale');
const Item = require('../models/Item');


exports.index = async (req, res) => {

  //Read sort and page values from the URL, e.g. ?sort=profit&page=2
  const sort  = req.query.sort;
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;

  //Default to sorting by newest first
  let sortObj = { createdAt: -1 };

  //If the user picked a different sort option, switch to that
  if (sort === 'saleDate') {
    sortObj = { saleDate: -1 };
  } else if (sort === 'profit') {
    sortObj = { profit: -1 };
  }

  //Figure out how many records to skip based on what page we're on
  //Example: page 2 with 10 per page means skip the first 10
  const skip = (page - 1) * limit;

  //Fetch only this page of sales, sorted the way the user picked
  const sales = await Sale.find({ user: req.user._id })
    .populate('item')   //Fill in the full item details instead of just its ID
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  //Count how many total sales exist so we can calculate the number of pages
  const total      = await Sale.countDocuments({ user: req.user._id });
  const totalPages = Math.ceil(total / limit);

  res.render('sales/index', {
    title: 'Sales',
    sales,
    sort: sort || '',   // Pass sort back so the dropdown stays selected
    page,
    totalPages,
  });

};


//Show the form to record a new sale
exports.newForm = async (req, res) => {

  //Only show items that haven't been sold yet
  const items = await Item.find({ user: req.user._id, isSold: false });

  res.render('sales/new', { title: 'Record Sale', items, errors: [], old: {} });

};


//Save a new sale to the database
exports.create = async (req, res) => {

  //Check if anything failed validation (rules are set in the route file)
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    //Re-fetch items so the form dropdown still works on reload
    const items = await Item.find({ user: req.user._id, isSold: false });
    return res.render('sales/new', {
      title: 'Record Sale',
      items,
      errors: errors.array(),
      old: req.body,   //Send the old input back so the user doesn't retype everything
    });
  }

  //Pull the submitted fields out of the request body
  const itemId       = req.body.item;
  const salePrice    = req.body.salePrice;
  const saleDate     = req.body.saleDate;
  const platformSold = req.body.platformSold;
  const buyerNotes   = req.body.buyerNotes;

  //Make sure the item actually exists and belongs to this user
  const item = await Item.findById(itemId);

  if (!item || !item.user.equals(req.user._id)) {
    req.flash('error', 'Item not found or access denied.');
    return res.redirect('/sales/new');
  }

  //Create the new sale record
  const sale = new Sale({
    user: req.user._id,
    item: itemId,
    salePrice,
    saleDate,
    platformSold,
    buyerNotes,
  });

  //Save it -- the Sale model automatically calculates profit before saving
  await sale.save();

  //Mark the item as sold so it no longer shows up in the "available" list
  item.isSold = true;
  await item.save();

  req.flash('success', 'Sale recorded.');
  res.redirect('/sales');

};


//Show details for a single sale
exports.show = async (req, res) => {

  //The sale ID comes from the URL, e.g. /sales/abc123
  const sale = await Sale.findById(req.params.id).populate('item');

  if (!sale) {
    req.flash('error', 'Sale not found.');
    return res.redirect('/sales');
  }

  // Make sure this sale belongs to the logged-in user before showing it
  if (!sale.user.equals(req.user._id)) {
    return res.status(403).render('error', {
      title: 'Forbidden',
      message: 'Access denied.',
      status: 403,
    });
  }

  res.render('sales/show', { title: 'Sale Details', sale });

};


//Show the form to edit an existing sale
exports.editForm = async (req, res) => {

  const sale = await Sale.findById(req.params.id).populate('item');

  if (!sale) {
    req.flash('error', 'Sale not found.');
    return res.redirect('/sales');
  }

  //Only the owner of this sale should be able to edit it
  if (!sale.user.equals(req.user._id)) {
    return res.status(403).render('error', {
      title: 'Forbidden',
      message: 'Access denied.',
      status: 403,
    });
  }

  //Pass the existing sale data as `old` so the form fields are pre-filled
  res.render('sales/edit', { title: 'Edit Sale', sale, errors: [], old: sale });

};


//Save the changes from the edit form
exports.update = async (req, res) => {

  //Check validation before doing anything else
  const errors = validationResult(req);

  const sale = await Sale.findById(req.params.id).populate('item');

  if (!sale) {
    req.flash('error', 'Sale not found.');
    return res.redirect('/sales');
  }

  //Block anyone who doesn't own this sale
  if (!sale.user.equals(req.user._id)) {
    return res.status(403).render('error', {
      title: 'Forbidden',
      message: 'Access denied.',
      status: 403,
    });
  }

  //If there were validation errors, re-render the edit form with them
  if (!errors.isEmpty()) {
    return res.render('sales/edit', {
      title: 'Edit Sale',
      sale,
      errors: errors.array(),
      old: req.body,
    });
  }

  //Apply the updated values from the form
  sale.salePrice    = req.body.salePrice;
  sale.saleDate     = req.body.saleDate;
  sale.platformSold = req.body.platformSold;
  sale.buyerNotes   = req.body.buyerNotes;

  //Save the changes -- profit gets recalculated automatically by the pre-save hook
  await sale.save();

  req.flash('success', 'Sale updated.');
  res.redirect(`/sales/${sale._id}`);

};


//Delete a sale and mark the item as available again
exports.delete = async (req, res) => {

  const sale = await Sale.findById(req.params.id);

  if (!sale) {
    req.flash('error', 'Sale not found.');
    return res.redirect('/sales');
  }

  //Only the owner can delete their own sales
  if (!sale.user.equals(req.user._id)) {
    return res.status(403).render('error', {
      title: 'Forbidden',
      message: 'Access denied.',
      status: 403,
    });
  }

  //Find the item that was sold so we can un-mark it
  const item = await Item.findById(sale.item);

  if (item) {
    //Put the item back into the available pool so it can be sold again
    item.isSold = false;
    await item.save();
  }

  //Remove the sale from the database
  await sale.deleteOne();

  req.flash('success', 'Sale deleted.');
  res.redirect('/sales');

};
