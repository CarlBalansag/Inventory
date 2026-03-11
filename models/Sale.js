const mongoose = require('mongoose'); 

const saleSchema = new mongoose.Schema({

  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, //Links this sale to the user who made it
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true }, //Links this sale to the item that was sold

  salePrice:    { type: Number, required: true }, //How much the item sold for, required
  saleDate:     { type: Date, required: true }, //When the item was sold, required
  platformSold: { type: String, required: true }, //Where the item was sold (e.g. eBay, StockX), required

  buyerNotes: { type: String }, //Optional notes about the buyer or sale
  profit:     { type: Number }, //Automatically calculated - how much was made after subtracting purchase price

  createdAt: { type: Date, default: Date.now }, //Automatically set to the current date/time when the sale is created

});

saleSchema.pre('save', async function () { //Runs automatically before every save

  if (this.isModified('salePrice') || this.isNew) { //Only recalculate profit if salePrice changed or it's a brand new sale

    const Item = mongoose.model('Item'); //Get the Item model to look up the purchase price
    const item = await Item.findById(this.item); //Find the item being sold

    if (item) this.profit = this.salePrice - item.purchasePrice; //Profit = what it sold for minus what it was bought for

  }

});

module.exports = mongoose.model('Sale', saleSchema); //Export the Sale model so other files can use it
