const Card = require('../models/Card');

exports.create = async (req, res) => {
  const { nickname } = req.body; //stores nickname from req.body
  if (!nickname || !nickname.trim()) { //Check if nickname is there or if it has white spaces
    return res.status(400)
      .json({ error: 'Card nickname is required.' }); //nickname error
  }
  const card = await Card.create({
    user: req.user._id, 
    nickname: 
    nickname.trim() 
    }
  ); //creates card with user id and nickname
  res.json({ 
    success: true, 
    card: { 
      _id: card._id, 
      nickname: card.nickname } 
    }
  ); //sends back the card id and nickname
};

exports.delete = async (req, res) => {
  const card = await Card.findById(req.params.id);
  if (!card) return res.status(404).json({ error: 'Card not found.' });//if no card is found return 404 no card found
  if (!card.user.equals(req.user._id)) return res.status(403).json({ error: 'Access denied.' }); //checks card belongs to the user logged in
  await card.deleteOne(); //deletes the card
  res.json({ success: true }); //sends back success true
};
