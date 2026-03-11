const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({

  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, //Links this sale to the user who made it
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true }, //Links this sale to the item that was sold

  salePrice:    { type: Number, required: true }, //How much each unit sold for, required
  quantitySold: { type: Number, required: true, min: 1, default: 1 }, //How many units were sold in this transaction
  saleDate:     { type: Date, required: true }, //When the item was sold, required
  platformSold: { type: String, required: true }, //Where the item was sold (e.g. eBay, StockX), required

  buyerNotes: { type: String }, //Optional notes about the buyer or sale
  profit:     { type: Number }, //Automatically calculated - total profit across all units sold

  createdAt: { type: Date, default: Date.now }, //Automatically set to the current date/time when the sale is created

});

saleSchema.pre('save', async function () { //Runs automatically before every save

  if (this.isModified('salePrice') || this.isModified('quantitySold') || this.isNew) { //Recalculate if price or qty changed

    const Item = mongoose.model('Item'); //Get the Item model to look up the purchase price
    const item = await Item.findById(this.item); //Find the item being sold

    if (item) {
      const qty = this.quantitySold || 1;
      this.profit = (this.salePrice - item.purchasePrice) * qty; //Profit = (sale price - cost) × units sold
    }

  }

});

module.exports = mongoose.model('Sale', saleSchema); //Export the Sale model so other files can use it
