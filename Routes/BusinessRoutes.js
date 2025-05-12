import express from 'express';
import {
  createBusinessCategory,
  getAllBusinessCategories,
  getSingleBusinessCategory,
  updateBusinessCategory,
  createBusinessPoster,
  getAllBusinessPosters,
  getBusinessPostersByCategory,
  getSingleBusinessPoster,
  updateBusinessPoster,
} from '../Controller/BusinessController.js';

const router = express.Router();

// 🟢 Create a new business category
router.post('/business-category', createBusinessCategory);

// 📦 Get all business categories
router.get('/getallbusiness-category', getAllBusinessCategories);

// 🔍 Get single business category by ID
router.get('/singlebusinesscategory/:id', getSingleBusinessCategory);

// ✏️ Update a business category
router.put('/:id', updateBusinessCategory);
// 🟢 Create a new business poster
router.post('/create-businessposter', createBusinessPoster);

// 📦 Get all business posters
router.get('/businessposters', getAllBusinessPosters);

// 🔍 Get business posters by category (e.g., Beauty Products, Chemicals, etc.)
router.get('/category/:categoryName', getBusinessPostersByCategory);

// 🔍 Get a single business poster by ID
router.get('/singlebusienssposter/:id', getSingleBusinessPoster);

// ✏️ Update a business poster
router.put('/:id', updateBusinessPoster);

export default router;
