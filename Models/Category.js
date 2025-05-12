import mongoose from 'mongoose';

const { Schema } = mongoose;

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      // You can add 'required: true' and 'trim: true' if needed later
    },
    subCategoryName: {
      type: String,
    },
    image: {
      type: String,
      default: 'default-category-image.jpg', // Optional default image
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

const Category = mongoose.model('Category', categorySchema);

export default Category;
