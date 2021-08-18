const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const tokenSchema = new Schema({
  user_id: {
    type: String,
    unique: true,
    require: true,
  },
  access_token: String, 
  refresh_token: String,
  scope: String,
  token_type: String,
  expiry_date: Number
}, {
  timestamps: true,
});

const Token = mongoose.model('token', tokenSchema, );

module.exports = Token;