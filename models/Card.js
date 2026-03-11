const mongoose = require('mongoose'); 
const cardSchema = new mongoose.Schema({

  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, //Links this card to the user who owns it
  nickname:  { type: String, required: true, trim: true }, //Name the user gives the card, can't be blank, whitespace trimmed
  createdAt: { type: Date, default: Date.now }, //Automatically set to the current date/time when the card is created

});

module.exports = mongoose.model('Card', cardSchema); //Export the Card model so other files can use it
