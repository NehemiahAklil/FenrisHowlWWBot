import mongoose from 'mongoose';

const packsSchema = mongoose.Schema({
  name: {
    type: String,
    unique: true,
    trim: true,
    required: true,
  },
  emblem: {
    type: String,
    unique: true,
    trim: true,
    required: true,
  },
  alphas: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: 'Players',
  },
  betas: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: 'Players',
  },
  owner: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true,
    ref: 'Players',
  },
  members: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: 'Players',
  },
});

const Packs = mongoose.model('Packs', packsSchema);
export default Packs;
