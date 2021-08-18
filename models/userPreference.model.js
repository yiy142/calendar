const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const preferenceSchema = new Schema({
  user_id: {
    type: String,
    unique: true
  },
  break_time: Number, 
  day_off: [Number],
  max_meeting: { type: Number },
  preferences: [{
    start: Date,
    end: Date,
    counter: Number
  }]
}, {
  timestamps: true,
});

const Preference = mongoose.model('preference', preferenceSchema, );

module.exports = Preference;