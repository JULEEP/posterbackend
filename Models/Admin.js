import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  phone: {
    type: String,
    match: /^[0-9]{10}$/,
  },
  password: {
    type: String,
  }
}, {
  timestamps: true,
});

const Admin =  mongoose.model("Admin", adminSchema);
export default Admin
