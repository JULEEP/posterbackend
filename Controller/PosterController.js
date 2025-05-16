import Poster from "../Models/Poster.js";
import cloudinary from "../config/cloudinary.js";

export const createPoster = async (req, res) => {
  try {
    // Destructure form data
    const { name, categoryName, price, description, size, festivalDate, inStock, tags } = req.body;

    // Check if images are uploaded
    if (!req.files || !req.files.images) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    // Check if multiple images are uploaded or just one
    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

    // Array to store uploaded image URLs
    const uploadedImages = [];

    // Loop through all the uploaded files and upload to Cloudinary
    for (const file of files) {
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "poster", // Specify a folder in Cloudinary
      });

      uploadedImages.push(result.secure_url);  // Store the secure URL of each image
    }

    // Create a new poster in your database
    const poster = new Poster({
      name,
      categoryName,
      price,
      images: uploadedImages,
      description,
      size,
      festivalDate,
      inStock,
      tags: tags ? tags.split(",") : [],  // Convert tags string to an array
    });

    // Save the new poster
    await poster.save();

    return res.status(201).json({
      message: "Poster created successfully",
      poster,
    });
  } catch (error) {
    console.error("❌ Error uploading to Cloudinary:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const editPoster = async (req, res) => {
  try {
    const { posterId } = req.params;  // Poster ID from URL parameter
    const {
      name,
      categoryName,
      price,
      description,
      size,
      festivalDate,
      inStock,
      tags
    } = req.body;

    // Find the existing poster by ID
    const poster = await Poster.findById(posterId);

    if (!poster) {
      return res.status(404).json({ message: 'Poster not found' });
    }

    // Handle new images if any were uploaded
    let images = poster.images; // Keep existing images by default

    // If new images are uploaded, add them to the existing ones
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const newImages = [];

      // Upload new images to Cloudinary
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: "poster", // Specify a folder in Cloudinary
        });
        newImages.push(result.secure_url);  // Store the secure URL of each image
      }

      // Append the new images to the existing ones
      images = [...images, ...newImages];
    }

    // Conditionally update the fields based on what is provided in the request body
    if (name) poster.name = name;
    if (categoryName) poster.categoryName = categoryName;
    if (price) poster.price = price;
    if (description) poster.description = description;
    if (size) poster.size = size;
    if (festivalDate) poster.festivalDate = festivalDate;
    if (inStock !== undefined) poster.inStock = inStock;
    if (tags) poster.tags = tags.split(",");  // Convert tags string to an array

    // Always update the images array, even if the other fields were not provided
    poster.images = images;

    // Save the updated poster
    const updatedPoster = await poster.save();

    return res.status(200).json({
      message: "Poster updated successfully",
      poster: updatedPoster,
    });
  } catch (error) {
    console.error("❌ Error editing poster:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Delete a poster
export const deletePoster = async (req, res) => {
  try {
    const { posterId } = req.params;  // Poster ID from URL parameter

    // Find and delete the poster by ID
    const poster = await Poster.findByIdAndDelete(posterId);

    if (!poster) {
      return res.status(404).json({ message: 'Poster not found' });
    }

    // Optionally, delete the image files from the server if you no longer need them
    // (Implementing file system deletion would require the 'fs' module and careful handling of the files)

    res.status(200).json({ message: 'Poster deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting poster', error });
  }
};


  
  
export const getAllPosters = async (req, res) => {
  try {
    // Fetch all posters, sorted by creation date in descending order
    let posters = await Poster.find().sort({ createdAt: -1 });

    // Send the posters with all fields (including price)
    res.status(200).json(posters);
  } catch (error) {
    console.error("Error fetching posters:", error);
    res.status(500).json({ message: 'Error fetching posters', error });
  }
};



// ✅ Get posters by categoryName
export const getPostersByCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({ message: 'categoryName is required' });
    }

    const posters = await Poster.find({ categoryName }).sort({ createdAt: -1 });

    res.status(200).json(posters);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posters by categoryName', error });
  }
};


// ✅ Get all posters from "Beauty Products" category
export const getAllPostersBeauty = async (req, res) => {
    try {
      const posters = await Poster.find({ categoryName: "Beauty Products" }).sort({ createdAt: -1 });
      res.status(200).json(posters);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching posters', error });
    }
  };


// ✅ Get all Chemical category posters
export const getChemicalPosters = async (req, res) => {
    try {
      const chemicalPosters = await Poster.find({ categoryName: "Chemical" }).sort({ createdAt: -1 });
      
      res.status(200).json(chemicalPosters);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching chemical posters', error });
    }
  };

  
// ✅ Get all Clothing category posters
export const getClothingPosters = async (req, res) => {
    try {
      const clothingPosters = await Poster.find({ categoryName: "Clothing" }).sort({ createdAt: -1 });
      
      res.status(200).json(clothingPosters);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching clothing posters', error });
    }
  };


// ✅ Get all Ugadi category posters
export const getUgadiPosters = async (req, res) => {
    try {
      const ugadiPosters = await Poster.find({ categoryName: "Ugadi" }).sort({ createdAt: -1 });
  
      res.status(200).json(ugadiPosters);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching Ugadi posters', error });
    }
  };
  
  

// ✅ Get a single poster by ID
export const getSinglePoster = async (req, res) => {
  try {
    const { id } = req.params;
    const poster = await Poster.findById(id);

    if (!poster) {
      return res.status(404).json({ message: 'Poster not found' });
    }

    res.status(200).json(poster);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching poster', error });
  }
};


export const getPostersByFestivalDates = async (req, res) => {
  try {
    const { festivalDate } = req.body;

    if (!festivalDate) {
      return res.status(400).json({ message: "Festival date is required" });
    }

    const posters = await Poster.find({ festivalDate }).sort({ createdAt: -1 });

    if (posters.length === 0) {
      return res.status(404).json({ message: "No posters found for this festival date" });
    }

    res.status(200).json(posters);
  } catch (error) {
    res.status(500).json({ message: "Error fetching posters", error });
  }
};


export const Postercreate = async (req, res) => {
  try {
    // Extract the form data from the request body
    const { name, categoryName, price, description, size, festivalDate, inStock, tags } = req.body;

    // If tags are sent as a comma-separated string, split them into an array
    const tagArray = tags ? tags.split(',') : [];

    // Create a new Poster document without image handling
    const newPoster = new Poster({
      name,
      categoryName,
      price,
      description,
      size,
      festivalDate: festivalDate || null,
      inStock,
      tags: tagArray,
    });

    // Save the poster to the database
    const savedPoster = await newPoster.save();

    // Send response back with success
    res.status(201).json({
      success: true,
      message: 'Poster created successfully',
      poster: savedPoster,
    });
  } catch (error) {
    console.error('Error creating poster:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

