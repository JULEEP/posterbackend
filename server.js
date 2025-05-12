import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDatabase from './db/connectDatabase.js';
import path from 'path'; // Import path to work with file and directory paths
import UserRoutes from './Routes/userRoutes.js'
import CategoryRoutes from './Routes/CategoryRoutes.js'
import PosterRoutes from './Routes/posterRoutes.js'
import { fileURLToPath } from 'url';  // Import the fileURLToPath method
import { sendBirthdayWishes } from './Controller/UserController.js';
import cron from 'node-cron';
import Story from './Models/Story.js';
import PlanRoutes from './Routes/PlanRoutes.js'
import BusinessRoutes from './Routes/BusinessRoutes.js'
import AdminRoutes from './Routes/AdminRoutes.js'
import User from './Models/User.js';
import { SendSms } from './config/twilioConfig.js';

dotenv.config();

const app = express();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ✅ Serve static files from /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
  origin: ['http://localhost:3000', 'https://posterbnaoadmin.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.options('*', cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Database connection
connectDatabase();

// Default route
app.get("/", (req, res) => {
    res.json({
        status: "success",    // A key to indicate the response status
        message: "Welcome to our service!", // Static message
    });
});
// Get the directory name for the current file (equivalent of __dirname in CommonJS)
// Run every day at 12:00 PM (Noon)
cron.schedule('0 12 * * *', () => {
    console.log('⏰ Running Birthday Wishes Job at 12 PM');
    sendBirthdayWishes(
      {}, 
      { 
        status: () => ({ json: (msg) => console.log('🎉 Birthday Log:', msg) }) 
      }
    );
  });


// Schedule a job to delete expired stories every hour
cron.schedule('0 * * * *', async () => {  // This will run every hour
  try {
      console.log('⏰ Running Expired Story Deletion Job');
      const currentDate = new Date();

      // Delete stories whose expired_at is less than the current time
      const expiredStories = await Story.deleteMany({
          expired_at: { $lt: currentDate }
      });

      console.log(`Deleted ${expiredStories.deletedCount} expired stories.`);
  } catch (error) {
      console.error('Error deleting expired stories:', error);
  }
});



// Cron job to run every day at 12 PM
cron.schedule('0 12 * * *', async () => {
  console.log('⏰ Running Birthday & Anniversary Wishes Job at 12 PM');

  // Get today's date
  const today = new Date();

  // Query all users and their customers
  const users = await User.find({}).populate('customers');  // Assuming 'customers' is an array of embedded documents

  users.forEach(user => {
    user.customers.forEach(async (customer) => {
      // Check if customer's birthday is today
      if (customer.dob && new Date(customer.dob).getDate() === today.getDate() &&
          new Date(customer.dob).getMonth() === today.getMonth()) {
        // Send birthday message
        const birthdayMessage = `🎉 Happy Birthday, ${customer.name}! 🎉 Wishing you a wonderful year ahead.`;
        await SendSms(customer.mobile, birthdayMessage);  // Send SMS
        console.log(`Sent Birthday SMS to ${customer.name} (${customer.mobile})`);
      }

      // Check if customer's anniversary is today
      if (customer.anniversaryDate && new Date(customer.anniversaryDate).getDate() === today.getDate() &&
          new Date(customer.anniversaryDate).getMonth() === today.getMonth()) {
        // Send anniversary message
        const anniversaryMessage = `💍 Happy Anniversary, ${customer.name}! 💍 Wishing you many more years of love and happiness.`;
        await SendSms(customer.mobile, anniversaryMessage);  // Send SMS
        console.log(`Sent Anniversary SMS to ${customer.name} (${customer.mobile})`);
      }
    });
  });

  console.log('🎉 Birthday and Anniversary wishes sent!');
});



// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve frontend static files (HTML, JS, CSS)
app.use(express.static(path.join(path.resolve(), '../client')));


// Create HTTP server with Express app
const server = http.createServer(app);

app.use('/api/users', UserRoutes);
app.use('/api/category', CategoryRoutes);
app.use('/api/poster', PosterRoutes);
app.use('/api/plans', PlanRoutes);
app.use('/api/business', BusinessRoutes);
app.use('/api/admin', AdminRoutes);



// Start the server
const port = process.env.PORT || 6000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
