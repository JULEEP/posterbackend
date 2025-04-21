import jwt from 'jsonwebtoken'; // For JWT token generation
import dotenv from 'dotenv';
import User from '../Models/User.js';
import multer from 'multer'; // Import multer for file handling
import path from 'path';  // To resolve file paths
import Booking from '../Models/Booking.js';
import Car from '../Models/Car.js';




// Set up storage for profile images using Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles'); // Specify folder to store uploaded files
  },
  filename: function (req, file, cb) {
    // Set the filename for the uploaded file
    cb(null, Date.now() + '-' + file.originalname); // Add timestamp to avoid conflicts
  },
});

// Filter to ensure only image files can be uploaded
const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    return cb(new Error('Invalid file type. Only JPG, JPEG, and PNG files are allowed.'));
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: fileFilter,
});


// User Registration Controller
export const registerUser = async (req, res) => {
  try {
    const { name, email, mobile } = req.body;

    // Check if user already exists
    const userExist = await User.findOne({ $or: [{ email }, { mobile }] });
    if (userExist) {
      return res.status(400).json({ message: 'User with this email or mobile already exists!' });
    }

    // Create a new user
    const newUser = new User({
      name,
      email,
      mobile,
    });

    // Save the user to the database
    await newUser.save();

    // Generate JWT token for the user
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    return res.status(201).json({ message: 'Registration successful', token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};



export const loginUser = async (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({ error: "Mobile number is required" });
  }

  try {
    // ✅ Find user by mobile number
    let user = await User.findOne({ mobile });

    // 🆕 If user doesn't exist, create one
    if (!user) {
      user = new User({ mobile });
      await user.save();
    }

    // ✅ Generate JWT Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: '1h',
    });

    // ✅ Respond with user info + token
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        mobile: user.mobile,
        name: user.name || null,
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Login failed",
      details: error.message
    });
  }
};



// User Controller (GET User)
export const getUser = async (req, res) => {
  try {
    const userId = req.params.userId;  // Get the user ID from request params

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    return res.status(200).json({
      message: 'User details retrieved successfully!', // Added message
      id: user._id,         // Include the user ID in the response
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage || 'default-profile-image.jpg', // Include profile image (or default if none)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};



// User Controller (UPDATE User)
export const updateUser = [
  upload.single('profileImage'),  // 'profileImage' is the field name in the Form Data
  async (req, res) => {
    try {
      const userId = req.params.id;  // Get the user ID from request params
      const { name, email, mobile } = req.body;

      // Find the user by ID
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found!' });
      }

      // Check if the email or mobile is already taken by another user
      const userExist = await User.findOne({
        $or: [{ email }, { mobile }],
      });

      if (userExist && userExist._id.toString() !== userId) {
        return res.status(400).json({
          message: 'Email or mobile is already associated with another user.',
        });
      }

      // Update user details
      user.name = name || user.name;
      user.email = email || user.email;
      user.mobile = mobile || user.mobile;

      // Check if a new profile image is uploaded
      if (req.file) {
        // Update the profile image
        user.profileImage = `/uploads/profiles/${req.file.filename}`;
      }

      // Save the updated user to the database
      await user.save();

      return res.status(200).json({
        message: 'User updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          profileImage: user.profileImage,  // Return the updated profile image
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
];





export const createProfile = [
  upload.single('profileImage'),  // 'profileImage' is the field name in the Form Data
  async (req, res) => {
    try {
      const userId = req.params.id; // Get userId from params

      // Check if the user already exists by userId
      const existingUser = await User.findById(userId);

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found!' });
      }

      // If a profile image is uploaded, update the profileImage field
      const profileImage = req.file ? `/uploads/profiles/${req.file.filename}` : existingUser.profileImage;

      // Update the user's profile image
      existingUser.profileImage = profileImage;

      // Save the updated user to the database
      await existingUser.save();

      return res.status(200).json({
        message: 'Profile image updated successfully!',
        user: {
          id: existingUser._id,
          profileImage: existingUser.profileImage,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
];

// Update Profile Image (with userId in params)
export const editProfile = [
  upload.single('profileImage'),  // 'profileImage' is the field name in the Form Data
  async (req, res) => {
    try {
      const userId = req.params.id; // Get userId from params

      // Check if the user exists by userId
      const existingUser = await User.findById(userId);

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found!' });
      }

      // If a profile image is uploaded, update the profileImage field
      const profileImage = req.file ? `/uploads/profiles/${req.file.filename}` : existingUser.profileImage;

      // Update the user's profile image
      existingUser.profileImage = profileImage;

      // Save the updated user to the database
      await existingUser.save();

      return res.status(200).json({
        message: 'Profile image updated successfully!',
        user: {
          id: existingUser._id,
          profileImage: existingUser.profileImage,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
];


// Get Profile (with userId in params)
export const getProfile = async (req, res) => {
  try {
    const userId = req.params.id;  // Get the user ID from request params

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};



export const createBooking = async (req, res) => {
  try {
    const { userId, carId, rentalStartDate, rentalEndDate, from, to, pickupLocation, dropLocation } = req.body;

    // Fetch the car details to get pricePerHour
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // Combine rentalStartDate with 'from' time to create the full start date
    const rentalStartDateTime = new Date(`${rentalStartDate}T${from}:00Z`);
    const rentalEndDateTime = new Date(`${rentalEndDate}T${to}:00Z`);

    // Ensure the rental period is valid
    if (rentalStartDateTime >= rentalEndDateTime) {
      return res.status(400).json({ message: 'Rental start date and time must be before the end date and time' });
    }

    // Calculate the duration in hours
    const durationInHours = Math.ceil((rentalEndDateTime - rentalStartDateTime) / (1000 * 60 * 60));
    const totalPrice = durationInHours * car.pricePerHour;

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);

    // Create a new booking document
    const newBooking = new Booking({
      userId,
      carId,
      rentalStartDate: rentalStartDateTime,
      rentalEndDate: rentalEndDateTime,
      totalPrice,
      pickupLocation,
      dropLocation,
      otp // <-- Add OTP to the booking
    });

    const savedBooking = await newBooking.save();

    // Find the user and add the booking ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.myBookings.push(savedBooking._id);
    await user.save();

    // Format readable date strings
    const readableStartDate = rentalStartDateTime.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
    });

    const readableEndDate = rentalEndDateTime.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
    });

    return res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        _id: savedBooking._id,
        userId: savedBooking.userId,
        carId: savedBooking.carId,
        rentalStartDate: readableStartDate,
        rentalEndDate: readableEndDate,
        totalPrice: savedBooking.totalPrice,
        status: savedBooking.status,
        paymentStatus: savedBooking.paymentStatus,
        pickupLocation: savedBooking.pickupLocation,
        dropLocation: savedBooking.dropLocation,
        otp: savedBooking.otp, // <-- Return OTP in response
        createdAt: savedBooking.createdAt,
        updatedAt: savedBooking.updatedAt
      },
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error creating booking' });
  }
};



export const getUserBookings = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.query; // status filter from query params

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    // Base query: always filter by userId in Booking model directly
    const query = { userId };

    // If status is passed in query, add it to the query object
    if (status) {
      query.status = status;
    }

    // Find bookings with optional status filtering
    const bookings = await Booking.find(query)
      .populate('carId') // Car details populated
      .sort({ createdAt: -1 }); // Optional: latest bookings first

    return res.status(200).json({
      message: 'Bookings fetched successfully',
      bookings
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
};


