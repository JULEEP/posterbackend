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



dotenv.config();

const app = express();

app.use(cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

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
const __filename = fileURLToPath(import.meta.url);


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

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve frontend static files (HTML, JS, CSS)
app.use(express.static(path.join(path.resolve(), '../client')));


// Create HTTP server with Express app
const server = http.createServer(app);

app.use('/api/users', UserRoutes);
app.use('/api/category', CategoryRoutes);
app.use('/api/poster', PosterRoutes);






// Start the server
const port = process.env.PORT || 6000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
