import express from "express";
import {
    createOrUpdateAboutUs,
    createOrUpdatePrivacyPolicy,
    getAboutUs,
    getAllContactMessages,
    getAllUsers,
    getAllUsersWithSubscribedPlans,
    getPrivacyPolicy,
    submitContactMessage,
    getDashboardData,
    createLogo,
    getAllLogos,
    updateLogo,
    deleteLogo,
    createBusinessCard,
    getAllBusinessCards,
    updateBusinessCard,
    deleteBusinessCard,
    registerAdmin,
    loginAdmin,
    getAdminProfile,
    logoutAdmin,
    deleteUser,
} from "../Controller/AdminController.js";
import uploads from "../config/uploadConfig.js";

const router = express.Router();

router.get("/getallusers", getAllUsers);
router.delete("/deleteuser/:id", deleteUser);
router.get('/usersplans', getAllUsersWithSubscribedPlans);
router.post('/privacy-policy', createOrUpdatePrivacyPolicy);
router.get('/getpolicy', getPrivacyPolicy);
router.post('/aboutus', createOrUpdateAboutUs);
router.get('/getaboutus', getAboutUs);
router.post('/contact', submitContactMessage);     // POST /api/contact
router.get('/getcontactus', getAllContactMessages);     // GET /api/contact
router.get('/dashboard', getDashboardData);
router.post('/createlogo', uploads, createLogo);
router.get('/getlogos', getAllLogos);
router.put('/updatelogo/:logoId', uploads, updateLogo);
router.delete('/deletelogo/:logoId', deleteLogo);
router.post('/createbusinesscard', uploads, createBusinessCard);
router.get('/getbusinesscards', getAllBusinessCards);
router.put('/updatebusinesscard/:businessCardId', uploads, updateBusinessCard);
router.delete('/deletebusinesscard/:businessCardId', deleteBusinessCard);
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/profile/:adminId', getAdminProfile);
router.post('/logout', logoutAdmin);






export default router;