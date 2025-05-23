import jwt from 'jsonwebtoken'; // For JWT token generation
import dotenv from 'dotenv';
import User from '../Models/User.js';
import multer from 'multer'; // Import multer for file handling
import path from 'path';  // To resolve file paths
import twilio from 'twilio';
import { SendSms } from '../config/twilioConfig.js';
import uploads from '../config/uploadConfig.js';
import Story from '../Models/Story.js';
import Plan from '../Models/Plan.js';
import mongoose from 'mongoose';
import Order from '../Models/Order.js';
import Poster from '../Models/Poster.js';
import BusinessPoster from '../Models/BusinessPoster.js';
import QRCode from 'qrcode';  // You need to install 'qrcode' using npm
import cloudinary from '../config/cloudinary.js';
import cron from 'node-cron';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js'; // ✅ note the ".js"
dayjs.extend(isSameOrAfter);





dotenv.config();


// Create Twilio client





// Set up storage for profile images using Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles'); // Specify folder to store uploadsed files
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


// Helper to generate 8-character referral code
const generateReferralCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

// User Registration Controller
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      dob,
      marriageAnniversaryDate,
      referralCode: enteredCode, // optional input field
    } = req.body;

    // ✅ Basic validation
    if (!name || !mobile || !dob) {
      return res.status(400).json({ message: 'Name, Mobile, and Date of Birth are required!' });
    }

    // ✅ Prevent duplicate email or mobile
    const userExist = await User.findOne({ $or: [{ email }, { mobile }] });
    if (userExist) {
      return res.status(400).json({ message: 'User with this email or mobile already exists!' });
    }

    // ✅ Generate a unique referral code for this new user
    let newReferralCode;
    let codeExists = true;
    while (codeExists) {
      newReferralCode = generateReferralCode();
      const existingCode = await User.findOne({ referralCode: newReferralCode });
      if (!existingCode) codeExists = false;
    }

    // ✅ Prepare new user data
    const newUser = new User({
      name,
      email,
      mobile,
      dob,
      marriageAnniversaryDate,
      referralCode: newReferralCode,
    });

    // ✅ Handle referral reward if a code was entered
    if (enteredCode) {
      const referrer = await User.findOne({ referralCode: enteredCode.toUpperCase() });
      if (referrer) {
        referrer.referralPoints += 10; // reward
        await referrer.save();
      } else {
        return res.status(400).json({ message: 'Invalid referral code!' });
      }
    }

    // ✅ Save the new user
    await newUser.save();

    // ✅ Issue JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: '1h',
    });

    // ✅ Respond with success
    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        dob: newUser.dob,
        marriageAnniversaryDate: newUser.marriageAnniversaryDate,
        referralCode: newUser.referralCode,
        referralPoints: newUser.referralPoints,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};





// Direct Twilio credentials
const TWILIO_SID = 'ACd37d269a71fda78661c1fd2a54a5b567';
const TWILIO_AUTH_TOKEN = '81cf6d33eb27bf051991ebcd9aecd9d0';
const TWILIO_PHONE = '+16193309459'; // Your Twilio phone number

// Twilio client setup
const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);

// 🔢 Generate 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

// 📲 Send OTP with clean message
const sendOTP = async (mobile, otp) => {
  const phoneNumber = `+91${mobile}`;
 const message = `Your one-time password (OTP) is: ${otp}. It is valid for 5 minutes. Do not share it with anyone. – Team POSTER BANAVO`;


  try {
    await client.messages.create({
      body: message,
      to: phoneNumber,
      from: TWILIO_PHONE,
    });

    console.log(`✅ OTP sent to ${phoneNumber}: ${otp}`);
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    throw new Error('Failed to send OTP');
  }
};

// 👤 LOGIN USER – Send OTP
export const loginUser = async (req, res) => {
  const { mobile } = req.body;

  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
  }

  try {
    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    const otp = generateOTP();
    await sendOTP(mobile, otp);

    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    return res.status(200).json({
      message: 'OTP sent successfully. Please verify.',
      otp, // ⚠️ For testing only, remove or mask in production
      token,
      user: {
        _id: user._id,
        mobile: user.mobile,
        name: user.name || null,
        dob: user.dob || null,
        email: user.email || null, // ✅ Added email
      },
    });
  } catch (err) {
    console.error('❌ Login Error:', err);
    return res.status(500).json({ error: 'Something went wrong', details: err.message });
  }
};



export const verifyOTP = async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ error: 'OTP is required' });
  }

  try {
    const user = await User.findOne({ otp: parseInt(otp) });

    if (!user) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP matched – clear OTP
    user.otp = null;
    user.otpExpiry = null; // Optional: only if you store expiry
    await user.save();

    return res.status(200).json({
      message: 'OTP verified successfully',
      user: {
        _id: user._id,
        mobile: user.mobile,
        name: user.name || null,
        dob: user.dob || null,
      },
    });
  } catch (err) {
    console.error('OTP Verification Error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};



// Birthday Wishes SMS Function
export const sendBirthdaySMS = async (mobile) => {
  const message = `
🎉 Happy Birthday! 🎂
Wishing you a day filled with love, joy, and success.
Enjoy your special day!

– Team POSTER
`;

  try {
    // Sending SMS via Twilio
    await client.messages.create({
      body: message,
      to: `+91${mobile}`,  // Indian mobile number format
      from: 'YOUR_TWILIO_PHONE',  // Replace with your Twilio phone number
    });
    console.log(`Birthday wishes sent to ${mobile}`);
  } catch (error) {
    console.error('Error sending birthday SMS:', error);
  }
};

// Anniversary Wishes SMS Function
export const sendAnniversarySMS = async (mobile) => {
  const message = `
💍 Happy Marriage Anniversary! 💖
Wishing you a lifetime of love, happiness, and togetherness.
Enjoy your special day!

– Team POSTER
`;

  try {
    // Sending SMS via Twilio
    await client.messages.create({
      body: message,
      to: `+91${mobile}`,  // Indian mobile number format
      from: 'YOUR_TWILIO_PHONE',  // Replace with your Twilio phone number
    });
    console.log(`Anniversary wishes sent to ${mobile}`);
  } catch (error) {
    console.error('Error sending anniversary SMS:', error);
  }
};

// Cron job to check for birthdays and anniversaries at 12 AM
cron.schedule('0 0 * * *', async () => {
  console.log('Running cron job for birthday and anniversary wishes...');

  const today = new Date().toISOString().split('T')[0];  // Get today's date in YYYY-MM-DD format

  // Find users with today's birthday
  const birthdayUsers = await User.find({
    dob: { $regex: today },  // Match the day and month of DOB (ignore year)
  });

  birthdayUsers.forEach(user => {
    sendBirthdaySMS(user.mobile);  // Send SMS to birthday users
  });

  // Find users with today's marriage anniversary
  const anniversaryUsers = await User.find({
    marriageAnniversaryDate: { $regex: today },  // Match the day and month of the anniversary
  });

  anniversaryUsers.forEach(user => {
    sendAnniversarySMS(user.mobile);  // Send SMS to anniversary users
  });
});

console.log('Cron job scheduled for birthdays and anniversaries at midnight.');



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

    // Find user by ID and populate the subscribedPlans
    const user = await User.findById(userId).populate('subscribedPlans.planId');  // Assuming `subscribedPlans` references `Plan` model

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    // Respond with user details along with subscribed plans and include dob and marriageAnniversaryDate
    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage,
      dob: user.dob || null,  // Return dob or null if not present
      marriageAnniversaryDate: user.marriageAnniversaryDate || null,  // Return marriageAnniversaryDate or null if not present
      subscribedPlans: user.subscribedPlans,  // Include subscribedPlans in the response
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
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


export const postStory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { caption } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Normalize all uploaded files into an array
    const uploadedFiles = Object.values(req.files || {}).flat();

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ message: "At least one media file (image, video, or audio) is required." });
    }

    const images = [];
    const videos = [];
    const audios = [];

    for (const file of uploadedFiles) {
      const fileType = file.mimetype.split('/')[0]; // image, video, audio

      // Upload directly to Cloudinary
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        resource_type: fileType,
        folder: "poster" // You can use "stories" if you prefer separating folders
      });

      // Categorize uploaded URLs
      if (fileType === 'image') images.push(result.secure_url);
      else if (fileType === 'video') videos.push(result.secure_url);
      else if (fileType === 'audio') audios.push(result.secure_url);
    }

    // Validate at least one valid media uploaded
    if (images.length === 0 && videos.length === 0 && audios.length === 0) {
      return res.status(400).json({ message: "Only image, video, or audio files are allowed." });
    }

    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 24);

    // Save story to DB
    const newStory = new Story({
      user: userId,
      caption,
      images,
      videos,
      audios,
      expired_at: expiredAt
    });

    await newStory.save();

    // Push story ID to user
    await User.findByIdAndUpdate(userId, {
      $push: { myStories: newStory._id }
    });

    const user = await User.findById(userId);

    // Final response
    res.status(201).json({
      message: "Story posted successfully!",
      story: {
        _id: newStory._id,
        user: user._id,
        caption: newStory.caption,
        images: newStory.images,
        videos: newStory.videos,
        audios: newStory.audios,
        expired_at: newStory.expired_at,
        user_name: user.name || null,
        user_mobile: user.mobile || null
      }
    });
  } catch (error) {
    console.error("Error posting story:", error);
    res.status(500).json({ message: "Something went wrong!", error: error.message });
  }
};






// Controller to get all stories
export const getAllStories = async (req, res) => {
  try {
    // Fetch all stories, sorted by expiration time (ascending)
    const stories = await Story.find().sort({ expired_at: 1 });

    // Filter out stories where images and videos are empty but caption exists
    const filteredStories = stories.filter(story => {
      // Keep stories where caption exists, but either images or videos should not be empty
      return (
        (story.caption && story.caption.trim() !== '') &&
        ((story.images && story.images.length > 0) || (story.videos && story.videos.length > 0))
      );
    });

    // Log filtered stories for debugging
    console.log("Filtered Stories: ", filteredStories);

    // Return the filtered stories in the response
    res.status(200).json({
      message: "Stories fetched successfully!",
      stories: filteredStories
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};


// ✅ Get user's all stories
export const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user and populate their stories
    const user = await User.findById(userId).populate('myStories');

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Filter stories: Keep only if images or videos are present
    const filteredStories = user.myStories.filter(story =>
      (story.images && story.images.length > 0) ||
      (story.videos && story.videos.length > 0)
    );

    // Return filtered stories
    res.status(200).json({
      message: "User's stories retrieved successfully!",
      stories: filteredStories,
    });
  } catch (error) {
    console.error("Error fetching user's stories:", error);
    res.status(500).json({ message: "Something went wrong!", error });
  }
};




export const deleteStory = async (req, res) => {
  try {
    const { userId, storyId } = req.params;
    const { mediaUrl } = req.body;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found." });
    }

    // Check if the logged-in user owns this story
    if (story.user.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized." });
    }

    // Filter the media item out from both arrays
    const originalImagesLength = story.images.length;
    const originalVideosLength = story.videos.length;

    story.images = story.images.filter(url => url !== mediaUrl);
    story.videos = story.videos.filter(url => url !== mediaUrl);

    // If nothing was removed, media URL not found
    if (
      story.images.length === originalImagesLength &&
      story.videos.length === originalVideosLength
    ) {
      return res.status(404).json({ message: "Media item not found in story." });
    }

    await story.save();

    res.status(200).json({ message: "Media item deleted successfully." });
  } catch (error) {
    console.error("Error deleting media item:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};




// Controller to handle the plan purchase
export const purchasePlan = async (req, res) => {
  try {
    const { userId, planId } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Static UPI ID for payment (example: "nishasinghvi143@okicici")
    const upiId = 'nishasinghvi143@okicici';

    // Generate the UPI payment link for QR code generation
    const upiLink = `upi://pay?pa=${upiId}&pn=YourAppName&mc=123456&tid=1234567890&tr=123456&tn=Subscription+for+${plan.name}&am=${plan.offerPrice}&cu=INR`;

    // Generate QR code
    const qrCode = await QRCode.toDataURL(upiLink);  // This generates the QR code as a data URL

    // Create the subscription plan object
    const newSubscribedPlan = {
      planId: plan._id,
      name: plan.name,
      originalPrice: plan.originalPrice,
      offerPrice: plan.offerPrice,
      discountPercentage: plan.discountPercentage,
      duration: plan.duration,
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Assuming 1-year subscription
    };

    // Push the new plan to the user's subscribedPlans array
    user.subscribedPlans.push(newSubscribedPlan);

    await user.save();

    // Respond with success message and QR code
    res.status(200).json({
      message: `Plan purchased successfully! You can complete your payment by: 
                1. Using UPI ID: ${upiId} 
                2. Scanning the QR code below to complete the payment.`,
      plan: newSubscribedPlan,
      upiId: upiId,  // Return the static UPI ID
      qrCode: qrCode  // Return the generated QR code as a data URL
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error purchasing plan' });
  }
};



// Controller to get user's subscribed plans
export const getSubscribedPlan = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has any subscribed plans
    if (!user.subscribedPlans || user.subscribedPlans.length === 0) {
      return res.status(404).json({ message: 'No subscribed plans found' });
    }

    // Respond with the user's subscribed plans details
    res.status(200).json({
      message: 'Subscribed plans fetched successfully',
      subscribedPlans: user.subscribedPlans,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching subscribed plans' });
  }
};



// User Registration Controller - Adding Customer to User's Customers Array
export const addCustomerToUser = async (req, res) => {
  try {
    const { customer } = req.body;  // Expecting customer details in the request body
    const { userId } = req.params;  // Getting userId from URL params

    // Validate mandatory fields for customer
    if (!userId || !customer) {
      return res.status(400).json({ message: 'User ID and customer details are required!' });
    }

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    // Add the new customer to the user's customers array
    user.customers.push(customer);

    // Save the updated user document
    await user.save();

    // Return the updated user data with the new customer added
    return res.status(200).json({
      message: 'Customer added successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        dob: user.dob,
        marriageAnniversaryDate: user.marriageAnniversaryDate,
        customers: user.customers,  // Return the updated customers array
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// Get all customers for a specific user by userId
export const getAllCustomersForUser = async (req, res) => {
  try {
    const { userId } = req.params;  // Get userId from URL params

    // Validate if userId is provided
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required!' });
    }

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    // Return the customers array from the user document
    return res.status(200).json({
      message: 'Customers fetched successfully!',
      customers: user.customers,  // Return the customers array
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// Update customer details by userId and customerId
export const updateCustomer = async (req, res) => {
  try {
    const { userId, customerId } = req.params;
    const updatedCustomerDetails = req.body;

    if (!userId || !customerId || !updatedCustomerDetails) {
      return res.status(400).json({ message: 'User ID, Customer ID, and updated customer details are required!' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    const customerIndex = user.customers.findIndex(customer => customer._id.toString() === customerId);
    if (customerIndex === -1) {
      return res.status(404).json({ message: 'Customer not found!' });
    }

    // Update customer fields
    user.customers[customerIndex] = {
      ...user.customers[customerIndex]._doc,
      ...updatedCustomerDetails,
    };

    await user.save();

    // Return updated customer only
    return res.status(200).json({
      message: 'Customer updated successfully!',
      customer: user.customers[customerIndex],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};




// Delete customer by userId and customerId (no ObjectId validation)
export const deleteCustomer = async (req, res) => {
  try {
    const { userId, customerId } = req.params;

    console.log(`Attempting to delete customer with ID: ${customerId}`);

    if (!userId || !customerId) {
      return res.status(400).json({ message: 'User ID and Customer ID are required!' });
    }

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    // Match customerId directly as string (no ObjectId casting)
    const customerIndex = user.customers.findIndex(
      customer => customer._id.toString() === customerId
    );

    console.log(`Customer index: ${customerIndex}`);

    if (customerIndex === -1) {
      return res.status(404).json({ message: 'Customer not found!' });
    }

    // Remove the customer from the array
    user.customers.splice(customerIndex, 1);

    // Save changes
    await user.save();

    return res.status(200).json({
      message: 'Customer deleted successfully!',
      customers: user.customers, // just return updated customers if you want to simplify
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};



// Function to send birthday wishes
export const sendBirthdayWishesToCustomers = async (req, res) => {
  try {
    // Get today's date (Only day and month)
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];  // Format as yyyy-mm-dd

    // Fetch all users and loop through their customers
    const users = await User.find();

    users.forEach(user => {
      user.customers.forEach(customer => {
        const customerDOB = new Date(customer.dob);
        const customerBirthday = customerDOB.toISOString().split('T')[0];  // Format as yyyy-mm-dd

        // Check if today is the customer's birthday
        if (todayDate === customerBirthday) {
          const message = `Happy Birthday, ${customer.name}! Wishing you a wonderful day.`;
          SendSms(customer.mobile, message);
        }
      });
    });

    res.status(200).json({ message: 'Birthday wishes sent successfully!' });
  } catch (error) {
    console.error('Error sending birthday wishes:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Function to send anniversary wishes
export const sendAnniversaryWishes = async (req, res) => {
  try {
    // Get today's date (Only day and month)
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];  // Format as yyyy-mm-dd

    // Fetch all users and loop through their customers
    const users = await User.find();

    users.forEach(user => {
      user.customers.forEach(customer => {
        const customerAnniversaryDate = new Date(customer.anniversaryDate);
        const customerAnniversary = customerAnniversaryDate.toISOString().split('T')[0];  // Format as yyyy-mm-dd

        // Check if today is the customer's anniversary
        if (todayDate === customerAnniversary) {
          const message = `Happy Anniversary, ${customer.name}! Wishing you many more years of happiness.`;
          SendSms(customer.mobile, message);
        }
      });
    });

    res.status(200).json({ message: 'Anniversary wishes sent successfully!' });
  } catch (error) {
    console.error('Error sending anniversary wishes:', error);
    res.status(500).json({ message: 'Server error' });
  }
}



export const buyPoster = async (req, res) => {
  try {
    const { userId, posterId, businessPosterId, quantity } = req.body;

    if (!userId || (!posterId && !businessPosterId) || !quantity) {
      return res.status(400).json({
        message: 'userId, posterId or businessPosterId, and quantity are required.'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if it's a regular poster or business poster
    let poster = null;
    let posterType = '';

    if (posterId) {
      poster = await Poster.findById(posterId);
      posterType = 'Poster';
    } else if (businessPosterId) {
      poster = await BusinessPoster.findById(businessPosterId);
      posterType = 'BusinessPoster';
    }

    if (!poster) {
      return res.status(404).json({ message: `${posterType || 'Poster'} not found.` });
    }

    if (!poster.inStock) {
      return res.status(400).json({ message: `${posterType} is out of stock.` });
    }

    const now = new Date();
    const hasActivePlan = user.subscribedPlans?.some(plan =>
      plan.startDate <= now && plan.endDate >= now
    );

    const totalAmount = hasActivePlan ? 0 : poster.price * quantity;

    const newOrder = new Order({
      user: user._id,
      poster: posterId || undefined,
      businessPoster: businessPosterId || undefined,
      quantity,
      totalAmount,
      status: 'Pending',
      orderDate: now
    });

    await newOrder.save();

    // Add order to user's bookings
    user.myBookings.push(newOrder._id);
    await user.save();

    return res.status(201).json({
      message: hasActivePlan
        ? `${posterType} ordered for free with active subscription.`
        : `${posterType} order placed successfully.`,
      order: newOrder
    });

  } catch (error) {
    console.error('Error in buyPoster:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const checkoutOrder = async (req, res) => {
  try {
    const { userId, orderId, paymentMethod } = req.body;

    // ✅ Admin's fixed UPI ID (updated to the required UPI ID)
    const adminUpiId = 'nishasinghvi143@okicici';

    // Validate required fields
    if (!userId || !orderId) {
      return res.status(400).json({ message: 'userId and orderId are required.' });
    }

    const user = await User.findById(userId);
    const order = await Order.findById(orderId).populate('poster');

    if (!user || !order) {
      return res.status(404).json({ message: 'User or Order not found.' });
    }

    if (String(order.user) !== String(user._id)) {
      return res.status(403).json({ message: 'Order does not belong to this user.' });
    }

    if (order.status !== 'Pending') {
      return res.status(400).json({ message: 'Order is not in a pending state.' });
    }

    // ✅ Generate UPI deep link for manual payment (if required)
    if (order.totalAmount > 0) {
      if (!paymentMethod) {
        return res.status(400).json({ message: 'paymentMethod is required for paid orders.' });
      }

      const upiLink = `upi://pay?pa=${adminUpiId}&pn=Juleep%20Admin&am=${order.totalAmount}&cu=INR`;

      return res.status(200).json({
        message: 'Please complete payment via your UPI app.',
        upiApp: paymentMethod,
        upiId: adminUpiId,  // Adding UPI ID to the response
        amount: order.totalAmount,
        upiLink, // Frontend can open this link to launch UPI app
        note: 'Click the link to open in PhonePe, Google Pay, etc. After payment, confirm manually.'
      });
    }

    // Free order — mark as completed immediately
    order.status = 'Completed';
    order.paymentDetails = {
      method: 'UPI',
      paymentDate: new Date()
    };
    await order.save();

    return res.status(200).json({
      message: 'Order completed using free subscription plan.',
      order
    });

  } catch (error) {
    console.error('Error in checkoutOrder:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};




export const getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const orders = await Order.find({ user: userId })
      .populate('poster', 'name price');

    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Error in getOrdersByUserId:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')     // optional: populate user info
      .populate('poster', 'name price');  // optional: populate poster info

    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// Update order status by ID
export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    )
      .populate('user', 'name email')
      .populate('poster', 'name price');

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ message: "Order status updated", order: updatedOrder });
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



// Delete order by ID
export const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error('Error in deleteOrder:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};




export const showBirthdayWishOrCountdown = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = dayjs();
    const name = user.name || 'User';
    const wishes = [];

    if (!user.dob) {
      return res.json({
        message: `DOB not found for ${name}`,
        wishes: [],
      });
    }

    const birthDate = dayjs(user.dob);
    let nextBirthday = birthDate.year(today.year());

    // If birthday this year is already gone, set to next year
    if (nextBirthday.isBefore(today, 'day')) {
      nextBirthday = nextBirthday.add(1, 'year');
    }

    const isToday = nextBirthday.format('MM-DD') === today.format('MM-DD');

    if (isToday && today.hour() === 0) {
      // Exactly 12 AM wish
      wishes.push(`🎉 It's 12:00 AM — Happy Birthday, ${name}! May your day be filled with happiness.`);
    } else if (isToday) {
      wishes.push(`🎉 Happy Birthday, ${name}! Wishing you joy and love.`);
    } else {
      const daysLeft = nextBirthday.diff(today, 'day');
      wishes.push(`🎂 ${name}, your birthday is in ${daysLeft} day(s) on ${nextBirthday.format('MMMM DD')}.`);
    }

    res.json({
      message: 'Birthday wish or countdown',
      wishes,
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};



export const getReferralCodeByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user || !user.referralCode) {
      return res.status(404).json({ message: 'Referral code not found.' });
    }

    return res.status(200).json({
      referralCode: user.referralCode
    });
  } catch (error) {
    console.error('Error fetching referral code:', error);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

