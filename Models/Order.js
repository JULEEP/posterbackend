import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  poster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poster',
  },

  businessPoster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessPoster',
    default: null
  },

  paymentMethod: {
    type: String,
    enum: ['PhonePe', 'GooglePay', 'Paytm', 'UPI', 'Free Plan'],
    default: 'UPI'
  },

  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  totalAmount: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  paymentDetails: {
    method: { type: String, enum: ['PhonePe', 'Other'], default: 'PhonePe' },
    upiId: String,
    paymentDate: Date
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
