const mongoose = require('mongoose');

const packsSchema = mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  alphas: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: 'Players',
  },
  members: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: 'Players',
  },
});
const Packs = mongoose.model('Packs', packsSchema);
module.exports = Packs;
