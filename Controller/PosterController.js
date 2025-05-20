import Poster from "../Models/Poster.js";
import cloudinary from "../config/cloudinary.js";
import { createCanvas, loadImage } from 'canvas';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';



// Cloudinary Config (if not already configured globally)
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

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
      tags,
      email,
      mobile,
      textSettings,   // JSON string
      logoSettings    // JSON string
    } = req.body;

    if (!req.files || !req.files.images) {
      return res.status(400).json({ message: 'No poster image uploaded' });
    }

    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    const bgImage = await loadImage(files[0].tempFilePath);
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bgImage, 0, 0);

    // Parse text settings
    let customTextSettings = {};
    try {
      if (textSettings) {
        customTextSettings = JSON.parse(textSettings);
      }
    } catch (err) {
      return res.status(400).json({ message: 'Invalid JSON in textSettings' });
    }

    // Parse logo settings
    let customLogoSettings = {};
    try {
      if (logoSettings) {
        customLogoSettings = JSON.parse(logoSettings);
      }
    } catch (err) {
      return res.status(400).json({ message: 'Invalid JSON in logoSettings' });
    }

    // Default text settings
    const defaultTextSettings = {
      name: { position: { dx: canvas.width / 2, dy: 100 }, font: 'bold 30px Arial', color: 'blue' },
      description: { position: { dx: canvas.width / 2, dy: 160 }, font: '24px Arial', color: 'purple' },
      email: { position: { dx: canvas.width / 2, dy: 220 }, font: '20px Arial', color: 'blue' },
      mobile: { position: { dx: canvas.width / 2, dy: 260 }, font: '20px Arial', color: 'green' }
    };

    const textItems = [
      { key: 'name', value: name },
      { key: 'description', value: description },
      email && { key: 'email', value: email },
      mobile && { key: 'mobile', value: mobile }
    ].filter(Boolean);

    // Render text
    textItems.forEach(({ key, value }) => {
      const settings = customTextSettings[key] || defaultTextSettings[key];
      const { position, font, color } = settings;
      ctx.font = font || '20px Arial';
      ctx.fillStyle = color || 'black';
      ctx.textAlign = 'center';
      ctx.fillText(value, position?.dx || canvas.width / 2, position?.dy || 100);
    });

    // Render logo
    if (req.files.logo) {
      const logoFile = Array.isArray(req.files.logo) ? req.files.logo[0] : req.files.logo;
      const logoImage = await loadImage(logoFile.tempFilePath);

      const {
        dx = canvas.width - 120,
        dy = 20,
        size = 100,
        shape = 'circle' // circle or square
      } = customLogoSettings;

      ctx.save();
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(dx + size / 2, dy + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
      }

      ctx.drawImage(logoImage, dx, dy, size, size);
      ctx.restore();
    }

    // Upload to Cloudinary
    const imageBuffer = canvas.toBuffer('image/png');
    cloudinary.uploader.upload_stream({ folder: 'posters' }, async (error, result) => {
      if (error) {
        return res.status(500).json({ message: 'Cloudinary upload failed', error: error.message });
      }

      const newPoster = new Poster({
        name,
        categoryName,
        price,
        images: [result.secure_url],
        description,
        size,
        festivalDate,
        inStock,
        email,
        mobile,
        tags: tags ? tags.split(',') : []
      });

      await newPoster.save();

      res.status(201).json({
        message: 'Poster created successfully',
        poster: newPoster
      });
    }).end(imageBuffer);
  } catch (error) {
    console.error('❌ Error creating poster:', error);
    res.status(500).json({
      message: 'Error creating poster',
      error: error.message
    });
  }
};

export const updatePoster = async (req, res) => {
  try {
    const { posterId } = req.params; // Assuming the posterId is passed in the URL
    const { name, categoryName, price, description, size, festivalDate, inStock, tags, textSettings, logoSettings } = req.body;

    // Find the existing poster by ID
    const poster = await Poster.findById(posterId);
    if (!poster) {
      return res.status(404).json({ message: "Poster not found" });
    }

    // Check if images are uploaded
    let uploadedImages = [...poster.images]; // Keep existing images if no new images are uploaded
    if (req.files && req.files.images) {
      // Check if multiple images are uploaded or just one
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

      // We will use the first image as the background
      const file = files[0];

      // Load the background image
      const bgImage = await loadImage(file.tempFilePath);
      const canvas = createCanvas(bgImage.width, bgImage.height);
      const ctx = canvas.getContext('2d');

      // Draw the background image
      ctx.drawImage(bgImage, 0, 0);

      // Parse textSettings if provided
      let customSettings = {};
      if (textSettings) {
        try {
          customSettings = JSON.parse(textSettings);
        } catch (err) {
          return res.status(400).json({ message: 'Invalid JSON in textSettings' });
        }
      }

      // Default styling (fallback if no settings provided)
      const defaults = {
        name: { position: { dx: canvas.width / 2, dy: 100 }, font: 'bold 30px Arial', color: 'blue' },
        description: { position: { dx: canvas.width / 2, dy: 160 }, font: '24px Arial', color: 'purple' },
        email: { position: { dx: canvas.width / 2, dy: 220 }, font: '20px Arial', color: 'blue' },
        mobile: { position: { dx: canvas.width / 2, dy: 260 }, font: '20px Arial', color: 'green' }
      };

      // Dynamic text items (with fallback to default settings)
      const textItems = [
        { key: 'name', value: name || poster.name },
        { key: 'description', value: description || poster.description },
        { key: 'email', value: req.body.email || poster.email },
        { key: 'mobile', value: req.body.mobile || poster.mobile }
      ];

      // Draw each text dynamically with custom or default settings
      textItems.forEach(({ key, value }) => {
        const settings = customSettings[key] || defaults[key];
        const { position, font, color } = settings;

        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = 'center'; // Center horizontally
        ctx.fillText(value, position.dx, position.dy);
      });

      // Draw logo if provided
      if (req.files.logo) {
        const logoFile = Array.isArray(req.files.logo) ? req.files.logo[0] : req.files.logo;
        const logoImage = await loadImage(logoFile.tempFilePath);
        const logoSize = 100; // Default logo size
        const logoX = logoSettings?.x || bgImage.width - logoSize - 20; // Default logo position: top-right corner
        const logoY = logoSettings?.y || 20;

        // Logo shape (circle, square, etc.) and position
        ctx.save();
        if (logoSettings?.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
          ctx.clip();
        }

        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      // Convert the canvas to a buffer (image)
      const imageBuffer = canvas.toBuffer('image/png');

      // Upload the image buffer directly to Cloudinary without using fs
      const cloudinaryUpload = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'posters' }, // Folder in Cloudinary
          (error, result) => {
            if (error) reject(error);
            resolve(result);
          }
        ).end(imageBuffer);
      });

      uploadedImages = [cloudinaryUpload.secure_url]; // Update with the new image URL
    }

    // Update the poster fields in the database
    const updatedPoster = await Poster.findByIdAndUpdate(
      posterId,
      {
        name: name || poster.name,
        categoryName: categoryName || poster.categoryName,
        price: price || poster.price,
        images: uploadedImages,
        description: description || poster.description,
        size: size || poster.size,
        festivalDate: festivalDate || poster.festivalDate,
        inStock: inStock !== undefined ? inStock : poster.inStock,
        tags: tags ? tags.split(",") : poster.tags, // Update tags if provided
        email: req.body.email || poster.email,
        mobile: req.body.mobile || poster.mobile
      },
      { new: true } // This ensures the returned document is the updated one
    );

    return res.status(200).json({
      message: "Poster updated successfully",
      poster: updatedPoster,
    });
  } catch (error) {
    console.error("❌ Error updating poster:", error);
    return res.status(500).json({
      message: "Error updating poster",
      error: error.message,
    });
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



// Helper: Create temp file path
const generateTempFilePath = (filename = 'poster.png') => {
  const tempDir = os.tmpdir();
  return path.join(tempDir, filename);
};

// Main controller function
export const createPosterAndUpload = async (req, res) => {
  try {
    const {
      backgroundUrl,
      textItems,
      name = 'Untitled Poster',
      categoryName = 'General',
      price = 0,
      description = '',
      size = 'A4',
      festivalDate = null,
      inStock = true,
      tags = [], // Default to an empty array if not provided
    } = req.body;

    // Validate required fields
    if (!backgroundUrl || !Array.isArray(textItems)) {
      return res.status(400).json({
        success: false,
        message: '"backgroundUrl" and "textItems" are required.',
      });
    }

    // Ensure tags is an array (if it's passed as a string, convert to array)
    if (typeof tags === 'string') {
      tags = tags.split(',').map(tag => tag.trim()); // Split by commas if a string is passed
    }

    // Load background image
    const bgImage = await loadImage(backgroundUrl);
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.drawImage(bgImage, 0, 0);

    // Draw text items
    textItems.forEach(({ text, position, style, align }) => {
      const { dx, dy } = position;
      const { fontFamily = 'Arial', fontSize = 24, color = 0x000000 } = style;

      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.textAlign = align === 1 ? 'center' : 'left';
      ctx.fillText(text, dx, dy);
    });

    // Convert to buffer & save temp file
    const buffer = canvas.toBuffer('image/png');
    const tempFilePath = generateTempFilePath(`poster-${Date.now()}.png`);
    await fs.writeFile(tempFilePath, buffer);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(tempFilePath, {
      folder: 'poster',
    });

    // Delete temp file
    await fs.unlink(tempFilePath);

    // Save to MongoDB
    const newPoster = await Poster.create({
      name,
      categoryName,
      price,
      images: [result.secure_url],
      description,
      size,
      festivalDate,
      inStock,
      tags,
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: 'Poster created successfully',
      poster: newPoster,
    });
  } catch (error) {
    console.error('Poster creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create and upload poster',
      error: error.message,
    });
  }
};

