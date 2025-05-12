import mongoose from 'mongoose';

const { Schema } = mongoose;

const privacyPolicySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
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
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

const PrivacyPolicy = mongoose.model('PrivacyPolicy', privacyPolicySchema);

export default PrivacyPolicy;
