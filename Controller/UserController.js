import jwt from 'jsonwebtoken'; // For JWT token generation
import dotenv from 'dotenv';
import User from '../Models/User.js';
import multer from 'multer'; // Import multer for file handling
import path from 'path';  // To resolve file paths
import twilio from 'twilio';
import { SendSms } from '../config/twilioConfig.js';



dotenv.config();



// Twilio credentials from environment
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;

// Create Twilio client
const client = twilio(accountSid, authToken);





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


// SMS sending function
export const sendSms = async (req, res) => {
  try {
    const { mobile, message } = req.body;

    if (!mobile || !message) {
      return res.status(400).json({ error: 'Mobile number and message are required.' });
    }

    const response = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: mobile
    });

    res.status(200).json({
      success: true,
      message: 'SMS sent successfully!',
      twilioResponse: response
    });
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS',
      details: error.message
    });
  }
};


// Controller to send birthday wishes
export const sendBirthdayWishes = async (req, res) => {
  try {
    const today = dayjs().format('MM-DD'); // Get today's date in MM-DD format
    const users = await User.find(); // Fetch all users from the DB

    const birthdayPeople = users.filter(user => {
      // Compare today's date with user's DOB (formatted as MM-DD)
      return user.dob && dayjs(user.dob).format('MM-DD') === today;
    });

    // Send birthday wishes to users whose birthday is today
    for (const user of birthdayPeople) {
      const message = `🎉 Happy Birthday ${user.name}! Wishing you a day filled with joy, laughter, and cake! 🎂🥳`;
      await SendSms(user.mobile, message); // Send SMS via Twilio
    }

    res.status(200).json({
      success: true,
      message: 'Birthday wishes sent to users.',
      totalWished: birthdayPeople.length
    });
  } catch (error) {
    console.error('Error sending birthday wishes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send birthday wishes',
      details: error.message
    });
  }
};


export const checkUserBirthday = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const today = dayjs().format('MM-DD');
    const dob = user.dob ? dayjs(user.dob).format('MM-DD') : null;

    if (dob === today) {
      return res.status(200).json({
        success: true,
        isBirthday: true,
        message: `🎉 Happy Birthday ${user.name}! Have a fantastic day! 🎂`,
      });
    } else {
      return res.status(200).json({
        success: true,
        isBirthday: false,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message
    });
  }
};


