import mongoose from 'mongoose';

const logoSchema = new mongoose.Schema({
  name: { type: String, },
  description: { type: String, },
  price: { type: Number, }, // Add price field
  image: { type: String, }, // Store image URL
}, { timestamps: true });

const Logo = mongoose.model('Logo', logoSchema);

export default Logo;
