import mongoose from 'mongoose';

const PosterCanvasSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    categoryName: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    size: {
      type: String,
      required: true
    },
    festivalDate: {
      type: Date,
      required: false
    },
    inStock: {
      type: Boolean,
      default: true
    },
    tags: {
      type: [String],
      default: []
    },
    email: {
      type: String,
      required: false
    },
    mobile: {
      type: String,
      required: false
    },
    images: {
      type: [String],
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Assign to a variable before exporting
const PosterCanvas = mongoose.model('PosterCanvas', PosterCanvasSchema);

export default PosterCanvas;
