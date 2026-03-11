const mongoose = require('mongoose'); 

const itemSchema = new mongoose.Schema({

  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, //Links this item to the user who owns it
  name:          { type: String, required: true, trim: true }, //Name of the item, required, whitespace trimmed
  category:      { type: String, trim: true }, //Optional category for the item (e.g. Shoes, Electronics)

  purchasePrice: { type: Number, required: true }, //How much the item was bought for, required
  purchaseDate:  { type: Date, required: true }, //When the item was purchased, required
  platformBought:{ type: String, required: true }, //Where the item was bought (e.g. eBay, StockX), required

  condition: { type: String, enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'], default: 'Good' }, //Condition of the item, must be one of the listed options
  isSold:    { type: Boolean, default: false }, //Tracks if the item has been sold, defaults to false
  quantity:  { type: Number, default: 1, min: 1 }, //How many of this item, defaults to 1, minimum of 1
  tax:       { type: Number, default: 0, min: 0 }, //Tax paid on the item, defaults to 0

  cardUsed:     { type: String, trim: true }, //Optional which card was used to buy the item
  purchaseLink: { type: String, trim: true }, //Optional link to where the item was purchased
  notes:        { type: String }, //Optional free text notes about the item
  tags:         [{ type: String }], //Optional array of tags for organizing items (e.g. ['sneakers', 'limited'])

  createdAt: { type: Date, default: Date.now }, //Automatically set to the current date/time when the item is created

});

module.exports = mongoose.model('Item', itemSchema); //Export the Item model so other files can use it
