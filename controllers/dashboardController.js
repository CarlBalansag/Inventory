const Item = require('../models/Item');
const Sale = require('../models/Sale');

exports.getDashboard = async (req, res) => {
  const userId = req.user._id;

  const [totalItems, salesAgg, inventoryCostAgg, totalQtyAgg, totalSoldQtyAgg, recentItems, recentSales] = await Promise.all([

    Item.countDocuments({ user: userId }), //Number of unique item documents

    Sale.aggregate([{ $match: { user: userId } }, { $group: { _id: null, totalProfit: { $sum: '$profit' } } }]), //Total profit

    Item.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: { $add: [
        { $multiply: ['$purchasePrice', { $ifNull: ['$quantity', 1] }] },
        { $ifNull: ['$tax', 0] },
      ] } } } },
    ]), //Total cost of all inventory purchased

    Item.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$quantity', 1] } } } },
    ]), //Total units ever added to inventory

    Sale.aggregate([{ $match: { user: userId } }, { $group: { _id: null, total: { $sum: '$quantitySold' } } }]), //Total units sold across all sales

    Item.find({ user: userId }).sort({ createdAt: -1 }).limit(5), //5 most recent items

    Sale.find({ user: userId }).populate('item').sort({ createdAt: -1 }).limit(5), //5 most recent sales

  ]);

  const totalProfit    = salesAgg.length ? salesAgg[0].totalProfit : 0;
  const inventoryCost  = inventoryCostAgg.length ? inventoryCostAgg[0].total : 0;
  const totalQty       = totalQtyAgg.length ? totalQtyAgg[0].total : 0;
  const totalSoldQty   = totalSoldQtyAgg.length ? totalSoldQtyAgg[0].total : 0;
  const inStock        = totalQty - totalSoldQty; //Units currently available across all items

  res.render('dashboard', {
    title: 'Dashboard',
    totalItems,
    inStock,
    totalProfit,
    inventoryCost,
    recentItems,
    recentSales,
  });
};
