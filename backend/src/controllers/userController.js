const User = require('../models/User.js');
const Clearance = require('../models/clearance.js');
const { cloudinary } = require('../config/cloudinary.js');

// @desc   Update profile picture
// @route  PUT /api/users/profile-picture
const updateProfilePicture = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Delete old image from Cloudinary if it exists
        if (user.profilePicturePublicId) {
            await cloudinary.uploader.destroy(user.profilePicturePublicId);
        } else if (user.profilePicture) {
            // Fallback for legacy records
            const publicId = user.profilePicture.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`Student_Images/${publicId}`);
        }

        user.profilePicture = req.file.path;
        user.profilePicturePublicId = req.file.filename;
        await user.save();

        res.json({ success: true, profilePicture: user.profilePicture });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Delete profile picture
// @route  DELETE /api/users/profile-picture
const deleteProfilePicture = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.profilePicturePublicId) {
            await cloudinary.uploader.destroy(user.profilePicturePublicId);
            user.profilePicture = null;
            user.profilePicturePublicId = null;
            await user.save();
        } else if (user.profilePicture) {
            // Fallback for legacy records
            const publicId = user.profilePicture.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`Student_Images/${publicId}`);
            user.profilePicture = null;
            await user.save();
        }

        res.json({ success: true, message: 'Profile picture deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Delete my user account
// @route  DELETE /api/users/profile
const deleteMyUserAccount = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Verify password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid password. Deletion aborted.' });
        }

        // Check Clearance Status (Must be Approved)
        const clearance = await Clearance.findOne({ student: user._id });
        if (!clearance || clearance.status !== 'Approved') {
            return res.status(403).json({ 
                success: false, 
                message: 'Profile deletion is only available after your clearance form is Approved by the hostel management.' 
            });
        }

        // Delete profile picture from Cloudinary first
        if (user.profilePicturePublicId) {
            await cloudinary.uploader.destroy(user.profilePicturePublicId);
        }

        // Delete the User document itself (keeping other records for warden to purge as per user rules)
        await User.findByIdAndDelete(user._id);

        res.json({ success: true, message: 'Your profile has been permanently deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { updateProfilePicture, deleteProfilePicture, deleteMyUserAccount };
