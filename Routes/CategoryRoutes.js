import express from "express";
import {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
} from "../Controller/CategoryController.js";

const router = express.Router();

router.post("/create-cateogry", createCategory);
router.get("/getall-cateogry", getAllCategories);
router.get("/:id", getSingleCategory);
router.put("/update/:id", updateCategory);

export default router;
