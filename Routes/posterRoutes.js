// routes/posterRoutes.js
import express from 'express';
import {
  createPoster,
  getAllPosters,
  getSinglePoster,
  getPostersByFestivalDate,
  getAllPostersBeauty,
  getChemicalPosters,
  getClothingPosters,
  getUgadiPosters
} from '../Controller/PosterController.js';

const router = express.Router();

router.post('/create-poster', createPoster);         // POST /api/posters
router.get('/getallposter', getAllPosters);         // GET /api/posters
router.get('/single-poster/:id', getSinglePoster);    // GET /api/posters/:id
router.get('/festival', getPostersByFestivalDate); 
router.get('/beautyposter', getAllPostersBeauty); 
router.get('/chemicalposter', getChemicalPosters); 
router.get('/clothingposter', getClothingPosters);
router.get('/ugadiposter', getUgadiPosters);






export default router;
