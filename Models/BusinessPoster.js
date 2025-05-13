import mongoose from 'mongoose';

// Business Poster Schema Definition
const businessPosterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    categoryName: {
      type: String,
    },
    price: {
      type: Number,
    },
    offerPrice: {
      type: Number,
      default: 0,  // Default offerPrice is 0
    },
    images: {
      type: [String],  // Array of image URLs or file paths
    },
    description: {
      type: String,
    },
    size: {
      type: String,
    },
    inStock: {
      type: Boolean,
    },
    tags: {
      type: [String],  // Array of tags for categorization
      default: [],  // Default empty array if no tags
    },
  },
  {
    timestamps: true,  // Automatically adds createdAt and updatedAt fields
  }
);

// Create the BusinessPoster model
const BusinessPoster = mongoose.model('BusinessPoster', businessPosterSchema);

export default BusinessPoster;
