const mongoose = require('mongoose');

const gamesSchema = mongoose.Schema({
  Id: {
    type: String,
    unique: true,
    sparse: true,
    required: true,
  },
  winnerPack: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: 'Packs',
  },
  winnerPlayers: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: 'Players',
  },
});
const Games = mongoose.model('Games', gamesSchema);
module.exports = Games;
