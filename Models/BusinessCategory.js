import mongoose from 'mongoose';

const { Schema } = mongoose;

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      trim: true,      // Trims extra spaces
    },
    image: {
      type: String,
      default: 'default-category-image.jpg', // Optional default image
    },
    subCategories: [
      {
        subCategoryName: {
          type: String,
          trim: true,      // Trims extra spaces
        },
      },
    ],
  },
  {
    timestamps: true,  // Automatically adds createdAt and updatedAt
  }
);

const BusinessCategory = mongoose.model('BusinessCategory', categorySchema);

export default BusinessCategory;
