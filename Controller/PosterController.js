import Poster from "../Models/Poster.js";
// ✅ Create a new poster
export const createPoster = async (req, res) => {
  try {
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

    let images = [];

    // ✅ Handle multiple image uploads via 'images'
    if (req.files && req.files['images']) {
      images = req.files['images'].map(file => `uploads/${file.filename}`);
    }

    // ✅ Handle single image upload via 'image'
    if (req.files && req.files['image']) {
      images.push(`uploads/${req.files['image'][0].filename}`);
    }

    const newPoster = new Poster({
      name,
      categoryName,
      price,
      description,
      size,
      festivalDate: festivalDate || null,
      inStock,
      tags,
      images,
    });

    const savedPoster = await newPoster.save();

    res.status(201).json({
      success: true,
      message: "Poster created successfully",
      poster: savedPoster,
    });
  } catch (error) {
    console.error("Error creating poster:", error);
    res.status(500).json({ success: false, message: "Error creating poster", error });
  }
};



// ✅ Edit an existing poster
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

    // Find the poster by ID
    const poster = await Poster.findById(posterId);

    if (!poster) {
      return res.status(404).json({ message: 'Poster not found' });
    }

    // Handle new images if any were uploaded
    let images = poster.images; // Keep existing images by default

    // If new images are uploaded, add them to the existing ones
    if (req.files['images']) {
      const newImages = req.files['images'].map(file => `uploads/${file.filename}`);
      images = [...images, ...newImages]; // Append new images to existing ones
    }

    if (req.files['image']) {
      const newImage = `uploads/${req.files['image'][0].filename}`;
      images.push(newImage);  // Append new single image if uploaded
    }

    // Update the poster fields
    poster.name = name || poster.name;
    poster.categoryName = categoryName || poster.categoryName;
    poster.price = price || poster.price;
    poster.images = images;
    poster.description = description || poster.description;
    poster.size = size || poster.size;
    poster.festivalDate = festivalDate || poster.festivalDate;
    poster.inStock = inStock !== undefined ? inStock : poster.inStock;
    poster.tags = tags || poster.tags;

    // Save the updated poster
    const updatedPoster = await poster.save();

    // Send the updated poster in response
    res.status(200).json(updatedPoster);
  } catch (error) {
    res.status(500).json({ message: 'Error editing poster', error });
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
    let posters = await Poster.find().sort({ createdAt: -1 });

    let hidePrice = true;

    // ✅ Check if user is authenticated and has an active plan
    if (req.user && req.user.id) {
      const user = await User.findById(req.user.id);
      const currentDate = new Date();

      const hasActivePlan = user.subscribedPlans.some(plan => {
        return new Date(plan.endDate) > currentDate;
      });

      if (hasActivePlan) {
        hidePrice = false;
      }
    }

    // ✅ If user has no active plan, remove price from posters
    if (hidePrice) {
      posters = posters.map(poster => {
        const { price, ...rest } = poster.toObject(); // Remove price
        return rest;
      });
    }

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

