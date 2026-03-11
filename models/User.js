const mongoose = require('mongoose'); 
const bcrypt = require('bcryptjs'); 

const userSchema = new mongoose.Schema({

  username:  { type: String, required: true, unique: true, trim: true }, //Username, required, must be unique, whitespace trimmed
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true }, //Email, required, must be unique, converted to lowercase
  password:  { type: String, required: true }, //Password, required - stored as a hashed string not plain text

  createdAt: { type: Date, default: Date.now }, //Automatically set to the current date/time when the user is created

});

userSchema.pre('save', async function () { //Runs automatically before every save

  if (!this.isModified('password')) return; //Skip hashing if the password hasn't changed

  this.password = await bcrypt.hash(this.password, 12); //Hash the password with a salt of 12 rounds before saving

});

userSchema.methods.comparePassword = function (candidate) { //Custom method to check a password at login
  return bcrypt.compare(candidate, this.password); //Compares the plain text input against the stored hash, returns true or false
};

module.exports = mongoose.model('User', userSchema); //Export the User model so other files can use it
