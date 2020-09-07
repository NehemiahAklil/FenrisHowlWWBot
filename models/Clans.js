const mongoose = require('mongoose');

const clansSchema = mongoose.Schema({
  name: String,
  gamesWonCount: Number,
  gamesPlayedCount: Number,
  howlPoints: Number,
  clanMembers: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: 'Players',
  },
});
const Clans = mongoose.model('Clans', clansSchema);
module.exports = Clans;
