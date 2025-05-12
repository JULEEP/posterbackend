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


// User Registration Controller
export const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, dob, marriageAnniversaryDate } = req.body;

    // Validate mandatory fields
    if (!name || !mobile || !dob) {
      return res.status(400).json({ message: 'Name, Mobile, and Date of Birth are required!' });
    }

    // Check if user already exists
    const userExist = await User.findOne({ $or: [{ email }, { mobile }] });
    if (userExist) {
      return res.status(400).json({ message: 'User with this email or mobile already exists!' });
    }

    // Create a new user with dob and marriageAnniversaryDate fields
    const newUser = new User({
      name,
      email,
      mobile,
      dob,  // Add DOB
      marriageAnniversaryDate,  // Add Marriage Anniversary Date
    });

    // Save the user to the database
    await newUser.save();

    // Generate JWT token for the user
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    // Return the response with user data
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
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};




export const loginUser = async (req, res) => {
  const { mobile } = req.body;

  // 🔴 Check if mobile is provided
  if (!mobile) {
    return res.status(400).json({ error: "Mobile number is required" });
  }

  // 🔴 Validate mobile number format (Example: Check if it's a 10-digit number)
  const mobilePattern = /^[0-9]{10}$/; // Basic 10-digit mobile number validation
  if (!mobilePattern.test(mobile)) {
    return res.status(400).json({ error: "Invalid mobile number format" });
  }

  try {
    // 🔍 Check if user exists with this mobile number
    const user = await User.findOne({ mobile });

    // ❌ If user does not exist
    if (!user) {
      return res.status(404).json({
        error: "User not found. Please register first."
      });
    }

    // 🔐 Create JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '1h' }
    );

    // ✅ Return user info + token
return res.status(200).json({
  message: "Login successful",
  token,
  user: {
    _id: user._id,
    mobile: user.mobile,
    name: user.name || null,
    dob: user.dob || null,  // Add dob here
  }
});

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Something went wrong during login",
      details: err.message
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


// ✅ Upload story (image, video, audio) for a user
export const postStory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { caption } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const fileFields = ['file', 'image', 'images', 'video', 'videos', 'audio', 'audios'];
    const uploadedFiles = fileFields.flatMap(field => req.files?.[field] || []);

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ message: "At least one media file (image, video, or audio) is required." });
    }

    const images = [];
    const videos = [];
    const audios = [];

    uploadedFiles.forEach(file => {
      const normalizedPath = file.path.replace(/\\/g, '/');
      if (file.mimetype.startsWith('image')) images.push(normalizedPath);
      else if (file.mimetype.startsWith('video')) videos.push(normalizedPath);
      else if (file.mimetype.startsWith('audio')) audios.push(normalizedPath);
    });

    if (images.length === 0 && videos.length === 0 && audios.length === 0) {
      return res.status(400).json({ message: "Only image, video, or audio files are allowed." });
    }

    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 24);

    const newStory = new Story({
      user: userId,
      images,
      videos,
      audios,
      caption,
      expired_at: expiredAt
    });

    await newStory.save();

    // ✅ Push the new story into the user's myStories array instead of replacing it
    await User.findByIdAndUpdate(userId, {
      $push: { myStories: newStory._id } // Adding to the array, not replacing
    });

    const user = await User.findById(userId);

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
    res.status(500).json({ message: "Something went wrong!", error });
  }
};






// Controller to get all stories
export const getAllStories = async (req, res) => {
  try {
    // Fetch all stories, sorted by expiration time (ascending)
    const stories = await Story.find().sort({ expired_at: 1 });

    // Return the stories
    res.status(200).json({
      message: "Stories fetched successfully!",
      stories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};


// ✅ Get user's all stories
export const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;  // User ID from params

    // Find the user by userId
    const user = await User.findById(userId).populate('myStories'); // Populate 'myStories' field to get complete story details

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // If user exists, return the user's stories
    res.status(200).json({
      message: "User's stories retrieved successfully!",
      stories: user.myStories,  // The populated stories will be here
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
