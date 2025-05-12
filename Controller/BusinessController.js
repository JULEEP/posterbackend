import BusinessCategory from "../Models/BusinessCategory.js";
import BusinessPoster from "../Models/BusinessPoster.js";

// 🟢 Create a new business category
export const createBusinessCategory = async (req, res) => {
  try {
    const { categoryName, image } = req.body;

    const newBusinessCategory = new BusinessCategory({
      categoryName,
      image,
    });

    const savedBusinessCategory = await newBusinessCategory.save();

    res.status(201).json({
      success: true,
      message: "Business category created successfully",
      category: savedBusinessCategory,
    });
  } catch (error) {
    console.error("Error creating business category:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 📦 Get all business categories
export const getAllBusinessCategories = async (req, res) => {
  try {
    const categories = await BusinessCategory.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "All business categories retrieved",
      categories,
    });
  } catch (error) {
    console.error("Error getting business categories:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🔍 Get single business category by ID
export const getSingleBusinessCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await BusinessCategory.findById(id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Business category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Business category retrieved successfully",
      category,
    });
  } catch (error) {
    console.error("Error getting business category:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✏️ Update a business category
export const updateBusinessCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, image } = req.body;

    const updatedCategory = await BusinessCategory.findByIdAndUpdate(
      id,
      { categoryName, image },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ success: false, message: "Business category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Business category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating business category:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// ✅ Create a new business poster
export const createBusinessPoster = async (req, res) => {
  try {
    const {
      name,
      categoryName,
      price,
      offerPrice, // New field
      images,
      description,
      size,
      inStock,
      tags
    } = req.body;

    const newBusinessPoster = new BusinessPoster({
      name,
      categoryName,
      price,
      offerPrice, // Include in the new document
      images,
      description,
      size,
      inStock,
      tags
    });

    const savedBusinessPoster = await newBusinessPoster.save();

    res.status(201).json(savedBusinessPoster);
  } catch (error) {
    res.status(500).json({ message: 'Error creating business poster', error });
  }
};

// ✅ Get all business posters
export const getAllBusinessPosters = async (req, res) => {
  try {
    const posters = await BusinessPoster.find().sort({ createdAt: -1 });
    res.status(200).json(posters);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching business posters', error });
  }
};

// ✅ Get all business posters from a specific category (e.g., Beauty Products)
export const getBusinessPostersByCategory = async (req, res) => {
  try {
    const { categoryName } = req.params;
    const posters = await BusinessPoster.find({ categoryName }).sort({ createdAt: -1 });
    res.status(200).json(posters);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posters by category', error });
  }
};

// ✅ Get a single business poster by ID
export const getSingleBusinessPoster = async (req, res) => {
  try {
    const { id } = req.params;
    const poster = await BusinessPoster.findById(id);

    if (!poster) {
      return res.status(404).json({ message: 'Business poster not found' });
    }

    res.status(200).json(poster);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching business poster', error });
  }
};

// ✅ Update a business poster
export const updateBusinessPoster = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryName, price, offerPrice, images, description, size, inStock, tags } = req.body;

    const updatedBusinessPoster = await BusinessPoster.findByIdAndUpdate(
      id,
      { name, categoryName, price, offerPrice, images, description, size, inStock, tags },
      { new: true }
    );

    if (!updatedBusinessPoster) {
      return res.status(404).json({ message: 'Business poster not found' });
    }

    res.status(200).json(updatedBusinessPoster);
  } catch (error) {
    res.status(500).json({ message: 'Error updating business poster', error });
  }
};
