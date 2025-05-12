import mongoose from 'mongoose';

const { Schema } = mongoose;

const aboutUsSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const AboutUs = mongoose.model('AboutUs', aboutUsSchema);

export default AboutUs;
