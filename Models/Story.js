import mongoose from 'mongoose';

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', },
    images: { type: [String], default: [] }, // 🔄 Changed to array
    videos: { type: [String], default: [] }, // 🔄 Changed to array
    caption: { type: String, default: '' },
    expired_at: { type: Date, },
     media: [
    {
      url: String,
      type: { type: String, } // optional
    }
  ],
  },
  { timestamps: true }
);

const Story = mongoose.model('Story', storySchema);

export default Story;
