const mongoose = require('mongoose');

const playersSchema = mongoose.Schema({
  TelegramId: String,
  firstName: String,
  gamesWonCount: Number,
  gamesAliveCount: Number,
  gamesCount: Number,
  howlPoints: Number,
  affiliatedClan: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'Clans',
  },
});
const Players = mongoose.model('Players', playersSchema);
module.exports = Players;
