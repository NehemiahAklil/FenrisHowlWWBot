import mongoose from 'mongoose';

const pointsSchema = mongoose.Schema({
  gameId: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: 'Games',
  },
  playerId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'Players',
    required: true,
    unique: true,
  },
  packId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'Packs',
  },
  howlPoints: {
    type: Number,
  },
});
const Points = mongoose.model('Points', pointsSchema);
export default Points;
