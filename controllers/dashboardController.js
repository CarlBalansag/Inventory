const Item = require('../models/Item');
const Sale = require('../models/Sale');

exports.getDashboard = async (req, res) => {
  const userId = req.user._id; //User ID
  const [totalItems, totalSold, salesAgg, inventoryCostAgg, recentItems, recentSales] = await Promise.all([ //Gets 6 database queries at once

    Item.countDocuments({ user: userId }), //Total items

    Item.countDocuments({ user: userId, isSold: true }), //Total sold

    Sale.aggregate([{ 
      $match: { user: userId } }, { $group: { _id: null, totalProfit: { $sum: '$profit' } } }]), //Total profit
    
    Item.aggregate([
      { $match: { user: userId } }, //filter to only look for itmes that belong to current logged in user
      { $group: { _id: null, total: { $sum: { 
        $add: [ //Adds two string together for each item 
          { $multiply: ['$purchasePrice', { $ifNull: ['$quantity', 1] }] },  //Multiply purchase price by quantity, if quantity is null set to 1
          { $ifNull: ['$tax', 0] }] //Adds tax if tax is null set to 0
      } } } },
    ]),

    Item.find({ user: userId }) //Find items that belong to the current logged in user
      .sort({ createdAt: -1 }) //Sort by most recent
      .limit(5), //Limit to 5 items

    Sale.find({ user: userId }) //Find sales that belong to the current logged in user
      .populate('item') //Populate the item field
      .sort({ createdAt: -1 }) //Sort by most recent
      .limit(5), //Limit to 5 sales
  
  ]);

  const totalProfit = salesAgg.length ? salesAgg[0].totalProfit : 0;
  const inventoryCost = inventoryCostAgg.length ? inventoryCostAgg[0].total : 0;
  res.render('dashboard', { title: 'Dashboard', totalItems, totalSold, totalProfit, inventoryCost, recentItems, recentSales });
};
