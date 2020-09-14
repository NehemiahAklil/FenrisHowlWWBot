const mongoose = require('mongoose');

const playersSchema = mongoose.Schema({
  TelegramId: {
    type: Number,
    unique: true,
    sparse: true,
    required: true,
  },
  firstName: String,
  userName: {
    type: String,
    unique: true,
    sparse: true,
  },
  loneWolfMode: {
    gamesWonCount: Number,
    gamesCount: Number,
    howlPoints: Number,
  },
  pack: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'Packs',
  },
});
const Players = mongoose.model('Players', playersSchema);
module.exports = Players;
