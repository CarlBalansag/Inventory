const { validationResult } = require('express-validator');
const Sale = require('../models/Sale');
const Item = require('../models/Item');


// Helper: compute total units sold for a given item
async function getQuantitySoldForItem(itemId) {
  const agg = await Sale.aggregate([
    { $match: { item: itemId } },
    { $group: { _id: null, total: { $sum: '$quantitySold' } } },
  ]);
  return agg.length ? agg[0].total : 0;
}


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
    sort: sort || '',
    page,
    totalPages,
  });

};


//Show the form to record a new sale
exports.newForm = async (req, res) => {

  //Get all items the user owns
  const allItems = await Item.find({ user: req.user._id });

  //For each item compute how many units are still available
  const itemsWithQty = await Promise.all(
    allItems.map(async (item) => {
      const sold = await getQuantitySoldForItem(item._id);
      const available = (item.quantity || 1) - sold;
      return { ...item.toObject(), _id: item._id, availableQty: available };
    })
  );

  //Only show items that still have stock
  const items = itemsWithQty.filter((i) => i.availableQty > 0);

  res.render('sales/new', { title: 'Record Sale', items, errors: [], old: {} });

};


//Save a new sale to the database
exports.create = async (req, res) => {

  //Check if anything failed validation
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    //Re-fetch items with available qty so the form still works
    const allItems = await Item.find({ user: req.user._id });
    const itemsWithQty = await Promise.all(
      allItems.map(async (item) => {
        const sold = await getQuantitySoldForItem(item._id);
        return { ...item.toObject(), _id: item._id, availableQty: (item.quantity || 1) - sold };
      })
    );
    const items = itemsWithQty.filter((i) => i.availableQty > 0);
    return res.render('sales/new', { title: 'Record Sale', items, errors: errors.array(), old: req.body });
  }

  //Pull the submitted fields out of the request body
  const itemId       = req.body.item;
  const salePrice    = parseFloat(req.body.salePrice);
  const quantitySold = parseInt(req.body.quantitySold) || 1;
  const saleDate     = req.body.saleDate;
  const platformSold = req.body.platformSold;
  const buyerNotes   = req.body.buyerNotes;

  //Make sure the item exists and belongs to this user
  const item = await Item.findById(itemId);

  if (!item || !item.user.equals(req.user._id)) {
    req.flash('error', 'Item not found or access denied.');
    return res.redirect('/sales/new');
  }

  //Double-check there is enough stock — guard against form tampering
  const alreadySold = await getQuantitySoldForItem(item._id);
  const available   = (item.quantity || 1) - alreadySold;

  if (quantitySold < 1 || quantitySold > available) {
    req.flash('error', `You can only sell between 1 and ${available} units.`);
    return res.redirect('/sales/new');
  }

  //Create the new sale record
  const sale = new Sale({
    user: req.user._id,
    item: itemId,
    salePrice,
    quantitySold,
    saleDate,
    platformSold,
    buyerNotes,
  });

  //Save it — profit is calculated automatically by the pre-save hook
  await sale.save();

  //Mark item as fully sold if no stock remains
  const newAvailable = available - quantitySold;
  item.isSold = newAvailable === 0;
  await item.save();

  req.flash('success', `Sale recorded. ${newAvailable} unit(s) still available.`);
  res.redirect('/sales');

};


//Show details for a single sale
exports.show = async (req, res) => {

  const sale = await Sale.findById(req.params.id).populate('item');

  if (!sale) {
    req.flash('error', 'Sale not found.');
    return res.redirect('/sales');
  }

  if (!sale.user.equals(req.user._id)) {
    return res.status(403).render('error', { title: 'Forbidden', message: 'Access denied.', status: 403 });
  }

  res.render('sales/show', { title: 'Sale Details', sale });

};


//Show the form to edit an existing sale (qty is read-only)
exports.editForm = async (req, res) => {

  const sale = await Sale.findById(req.params.id).populate('item');

  if (!sale) {
    req.flash('error', 'Sale not found.');
    return res.redirect('/sales');
  }

  if (!sale.user.equals(req.user._id)) {
    return res.status(403).render('error', { title: 'Forbidden', message: 'Access denied.', status: 403 });
  }

  res.render('sales/edit', { title: 'Edit Sale', sale, errors: [], old: sale });

};


//Save changes from the edit form (price, date, platform, notes only — qty is locked)
exports.update = async (req, res) => {

  const errors = validationResult(req);

  const sale = await Sale.findById(req.params.id).populate('item');

  if (!sale) {
    req.flash('error', 'Sale not found.');
    return res.redirect('/sales');
  }

  if (!sale.user.equals(req.user._id)) {
    return res.status(403).render('error', { title: 'Forbidden', message: 'Access denied.', status: 403 });
  }

  if (!errors.isEmpty()) {
    return res.render('sales/edit', { title: 'Edit Sale', sale, errors: errors.array(), old: req.body });
  }

  //Apply the updated values — quantity stays the same
  sale.salePrice    = req.body.salePrice;
  sale.saleDate     = req.body.saleDate;
  sale.platformSold = req.body.platformSold;
  sale.buyerNotes   = req.body.buyerNotes;

  //Profit recalculates automatically in the pre-save hook
  await sale.save();

  req.flash('success', 'Sale updated.');
  res.redirect(`/sales/${sale._id}`);

};


//Delete a sale and restore item stock
exports.delete = async (req, res) => {

  const sale = await Sale.findById(req.params.id);

  if (!sale) {
    req.flash('error', 'Sale not found.');
    return res.redirect('/sales');
  }

  if (!sale.user.equals(req.user._id)) {
    return res.status(403).render('error', { title: 'Forbidden', message: 'Access denied.', status: 403 });
  }

  //Find the linked item and un-mark it as sold since we're giving units back
  const item = await Item.findById(sale.item);

  if (item) {
    item.isSold = false; //Restoring the sale means stock is available again
    await item.save();
  }

  //Remove the sale from the database
  await sale.deleteOne();

  req.flash('success', 'Sale deleted and stock restored.');
  res.redirect('/sales');

};
