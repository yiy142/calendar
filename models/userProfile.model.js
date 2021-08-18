const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const profileSchema = new Schema({
  email: {
    type: String,
    unique: true
  },
  name: String, 
  picture: String,
  calendarId: String,
}, {
  timestamps: true,
});

const Profile = mongoose.model('profile', profileSchema, );

module.exports = Profile;