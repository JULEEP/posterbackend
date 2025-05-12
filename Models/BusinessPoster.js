import mongoose from 'mongoose';

// Business Poster Schema Definition
const businessPosterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,  // Name is required
    },
    categoryName: {
      type: String,
      required: true,  // Category name is required
    },
    price: {
      type: Number,
      required: true,  // Price is required
    },
    offerPrice: {
      type: Number,
      default: 0,  // Default offerPrice is 0
    },
    images: {
      type: [String],  // Array of image URLs or file paths
      required: true,  // Images are required
    },
    description: {
      type: String,
      required: true,  // Description is required
    },
    size: {
      type: String,
      required: true,  // Size is required
    },
    inStock: {
      type: Boolean,
      required: true,  // inStock is required (true/false)
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
