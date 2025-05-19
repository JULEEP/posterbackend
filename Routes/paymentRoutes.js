// routes/paymentRoutes.js
import express from 'express';
import { payWithPhonePe, phonePeCallbackHandler } from '../Controller/paymentController.js';

const router = express.Router();

router.post('/phonepe', payWithPhonePe);
router.post('/phonepe/callback', phonePeCallbackHandler);


export default router;
