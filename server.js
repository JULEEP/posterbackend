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
import PlanRoutes from './Routes/PlanRoutes.js'
import BusinessRoutes from './Routes/BusinessRoutes.js'
import AdminRoutes from './Routes/AdminRoutes.js'

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



// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve frontend static files (HTML, JS, CSS)


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
