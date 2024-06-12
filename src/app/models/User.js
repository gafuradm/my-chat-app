const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  online: { type: Boolean, default: true }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
