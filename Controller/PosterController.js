import Poster from "../Models/Poster.js";
// ✅ Create a new poster
export const createPoster = async (req, res) => {
    try {
      const {
        name,
        categoryName,
        price,
        images,
        description,
        size,
        festivalDate, // festivalDate is now optional
        inStock,
        tags
      } = req.body;
  
      // If festivalDate is provided, convert it to a human-readable format, otherwise set it to null or default
      const formattedFestivalDate = festivalDate 
        ? new Date(festivalDate).toLocaleDateString('en-GB') // Format as 'dd/mm/yyyy'
        : null; // If no festivalDate, keep it as null or you can set it to a default value like new Date()
  
      // Create new poster object
      const newPoster = new Poster({
        name,
        categoryName,
        price,
        images,
        description,
        size,
        festivalDate: formattedFestivalDate, // Store festivalDate if provided, otherwise null
        inStock,
        tags
      });
  
      // Save the poster
      const savedPoster = await newPoster.save();
  
      // Send response with the poster, including festivalDate if it's set
      res.status(201).json({
        ...savedPoster.toObject(),
        festivalDate: formattedFestivalDate // Include festivalDate in response (it can be null)
      });
    } catch (error) {
      res.status(500).json({ message: 'Error creating poster', error });
    }
  };
  
  
// ✅ Get all posters
export const getAllPosters = async (req, res) => {
  try {
    const posters = await Poster.find().sort({ createdAt: -1 });
    res.status(200).json(posters);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posters', error });
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


// ✅ Get posters by festivalDate
export const getPostersByFestivalDate = async (req, res) => {
    try {
      const { festivalDate } = req.query;
  
      if (!festivalDate) {
        return res.status(400).json({ message: "Festival date is required" });
      }
  
      const posters = await Poster.find({ festivalDate: new Date(festivalDate) }).sort({ createdAt: -1 });
  
      if (posters.length === 0) {
        return res.status(404).json({ message: "No posters found for this festival date" });
      }
  
      res.status(200).json(posters);
    } catch (error) {
      res.status(500).json({ message: "Error fetching posters", error });
    }
  };
