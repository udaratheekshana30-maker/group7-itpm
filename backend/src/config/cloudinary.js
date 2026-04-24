const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const isImage = file.mimetype.startsWith('image/');
        const timestamp = Date.now();
        const rnd = Math.round(Math.random() * 1e6);
        const originalName = file.originalname
            ? file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
            : 'attachment';

        const folder = req.originalUrl.includes('complaints') ? 'Complaint_Image' :
            req.originalUrl.includes('applications') ? 'Student_Health' :
                req.originalUrl.includes('users') ? 'Student_Images' :
                    req.originalUrl.includes('student-payments/refundable') ? 'Financial_Payment' :
                        req.originalUrl.includes('student-payments/monthly') ? 'Monthly_Payment' : 'Notices';

        return {
            folder: folder,
            resource_type: isImage ? 'image' : 'raw',
            public_id: `${timestamp}-${rnd}-${originalName}`,
        };
    },
});

// Accept up to 5 files, max 10 MB each
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,  // 10 MB per file
        files: 5,
    },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} is not allowed.`), false);
        }
    },
});

module.exports = { cloudinary, upload };
