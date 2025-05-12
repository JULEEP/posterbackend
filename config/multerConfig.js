import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeDir = (dir) => fs.mkdirSync(dir, { recursive: true });

// 📁 Define all directories
const dirs = {
  support: path.join(__dirname, '..', 'uploads', 'support'),
  documents: path.join(__dirname, '..', 'uploads', 'documents'),
  testImages: path.join(__dirname, '..', 'uploads', 'testimages'),
  companyImages: path.join(__dirname, '..', 'uploads', 'company-images'),
  staffImages: path.join(__dirname, '..', 'uploads', 'staff-images'),
  doctorImages: path.join(__dirname, '..', 'uploads', 'categoryimage')
};

// 🔧 Create all directories
Object.values(dirs).forEach(makeDir);

// Generic filename generator
const getFilename = (file) => `${Date.now()}-${file.originalname}`;

// 🧾 Support file upload
export const uploadSupportFile = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.support),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('file');

// 📄 Document upload
export const uploadDocuments = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.documents),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
}).array('documents', 5);

// 🧪 Test image upload
export const uploadTestImages = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.testImages),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('testImage');

// 🏢 Company assets upload
export const uploadCompanyAssets = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'image') cb(null, dirs.companyImages);
      else if (file.fieldname === 'documents') cb(null, dirs.documents);
      else cb(new Error('Invalid field'), null);
    },
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'documents', maxCount: 5 }
]);

// 👥 Staff images upload
export const uploadStaffImages = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.staffImages),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'idImage', maxCount: 1 }
]);

// 🧑‍⚕️ Doctor image upload
export const uploadDoctorImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.doctorImages),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');
