import express from 'express';
import { 
  createPlan, 
  updatePlan, 
  deletePlan, 
  addFeature, 
  removeFeature, 
  getAllPlans, 
  getSinglePlan 
} from '../Controller/PlanController.js';

const router = express.Router();

// Create a new plan
router.post('/create-plan', createPlan);

// Update a plan
router.put('/update/:id', updatePlan);

// Delete a plan
router.delete('/delete/:id', deletePlan);

// Add a feature to a plan
router.post('/add-feature/:id', addFeature);

// Remove a feature from a plan
router.post('/remove-feature/:id', removeFeature);

// Get all plans
router.get('/getallplan', getAllPlans);

// Get a single plan by ID
router.get('/singleplan/:id', getSinglePlan);

export default router;
