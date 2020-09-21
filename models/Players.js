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
    trim: true,
    index: {
      unique: true,
      partialFilterExpression: { userName: { $type: 'string' } },
    },
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
