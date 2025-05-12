import mongoose from 'mongoose';

const BusinessCardSchema = new mongoose.Schema({
  name: { type: String },
  category: { type: String },
  price: { type: Number },
  offerPrice: { type: Number, default: 0 },
  description: { type: String },
  size: { type: String },
  tags: [{ type: String }],
  inStock: { type: Boolean, default: true },
  images: [{ type: String }],
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

const BusinessCard = mongoose.model('BusinessCard', BusinessCardSchema);
export default BusinessCard;
