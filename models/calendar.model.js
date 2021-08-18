const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const calendarSchema = new Schema({
  calendarId: {
    type: String,
    unique: true
  },
  treeArcNodes: Object,
  lastEventId: String,
  channelInfo: Object,
  resourceId: String,
  syncToken: String,
}, {
  timestamps: true,
});

const Calendar = mongoose.model('calendar', calendarSchema, );

module.exports = Calendar;