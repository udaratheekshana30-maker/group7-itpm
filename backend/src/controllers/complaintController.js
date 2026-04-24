const Complaint = require('../models/Complaint.js');
const { cloudinary } = require('../config/cloudinary.js');

// @desc   Create a new complaint (Student)
const createComplaint = async (req, res) => {
    try {
        const { title, description, category } = req.body;
        const image = req.file ? req.file.path : null;
        const imagePublicId = req.file ? req.file.filename : null;

        const complaint = await Complaint.create({
            title,
            description,
            category: category || 'Other',
            image,
            imagePublicId,
            submittedBy: req.user._id,
            messages: [{ sender: req.user._id, content: description, senderRole: 'student' }],
            wardenUnreadCount: 1,
            studentUnreadCount: 0
        });

        const populated = await complaint.populate('submittedBy', 'name email studentId');
        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Get only the current student's complaints
const getMyComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({ submittedBy: req.user._id })
            .populate('submittedBy', 'name email studentId')
            .sort({ updatedAt: -1 });
        res.json({ success: true, data: complaints });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Get all complaints (Warden — no auth required)
const getComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .populate('submittedBy', 'name email studentId')
            .sort({ updatedAt: -1 });
        res.json({ success: true, data: complaints });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Get single complaint by ID (open for warden, ownership-checked for student)
const getComplaintById = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate('submittedBy', 'name email studentId');

        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

        // Clear unread flags
        // Reset unread counts when viewed
        if (req.user && req.user.role === 'student') {
            const ownerId = complaint.submittedBy?._id?.toString() || complaint.submittedBy?.toString();
            if (ownerId !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
            if (complaint.studentUnreadCount > 0) {
                complaint.studentUnreadCount = 0;
                await complaint.save();
            }
        } else {
            // Either warden (synthetic user/token) OR public access to warden dashboard
            if (complaint.wardenUnreadCount > 0) {
                complaint.wardenUnreadCount = 0;
                await complaint.save();
            }
        }

        res.json({ success: true, data: complaint });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Add a chat message (student uses JWT; warden uses synthetic user injected by route)
const addMessage = async (req, res) => {
    try {
        const { content } = req.body;
        const file = req.file;

        if ((!content || !content.trim()) && !file) {
            return res.status(400).json({ success: false, message: 'Message content or file is required' });
        }

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

        const role = req.user?.role || 'warden';

        // Students can only message their own complaints
        if (role === 'student' && complaint.submittedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // For warden (synthetic user with _id='warden'), do not store ObjectId as sender
        const senderId = role === 'warden' ? null : req.user._id;

        const newMessage = {
            sender: senderId,
            content: content?.trim() || '',
            senderRole: role
        };

        if (file) {
            newMessage.fileUrl = file.path;
            newMessage.filePublicId = file.filename;
            newMessage.fileType = file.mimetype.startsWith('image/') ? 'image' : 'document';
        }

        complaint.messages.push(newMessage);
        complaint.updatedAt = Date.now();
        if (complaint.status === 'open' && role === 'warden') complaint.status = 'in-progress';
        
        // Update unread flags
        if (role === 'student') {
            complaint.wardenUnreadCount += 1;
        } else {
            complaint.studentUnreadCount += 1;
        }
        
        await complaint.save();

        const updated = await Complaint.findById(req.params.id)
            .populate('submittedBy', 'name email studentId')
            .populate('messages.sender', 'name role');

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Update complaint status (Warden — no auth required)
const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['open', 'in-progress', 'resolved'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: Date.now() },
            { returnDocument: 'after' }
        ).populate('submittedBy', 'name email studentId');

        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
        res.json({ success: true, data: complaint });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Send complaint to Dean via email (Warden)
const sendToDean = async (req, res) => {
    try {
        const nodemailer = require('nodemailer');
        const { title, description } = req.body;
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        await transporter.sendMail({
            from: `"Hostel Warden" <${process.env.EMAIL_USER}>`,
            to: process.env.DEAN_EMAIL,
            subject: `Urgent Warden Complaint: ${title}`,
            text: description + `\n\nSent by warden via Hostel Management System`,
            html: `<p>${description.replace(/\n/g, '<br>')}</p><p>Sent via system</p>`
        });
        res.json({ success: true, message: 'Email sent to dean' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Delete a complaint (Student/Warden)
const deleteComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

        // If student, check ownership
        if (req.user && req.user.role === 'student') {
            const ownerId = complaint.submittedBy?._id?.toString() || complaint.submittedBy?.toString();
            if (ownerId !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        // Delete Main Image
        if (complaint.imagePublicId) {
            await cloudinary.uploader.destroy(complaint.imagePublicId);
        }

        // Delete Chat Attachments
        for (const msg of complaint.messages) {
            if (msg.filePublicId) {
                try {
                    await cloudinary.uploader.destroy(msg.filePublicId, {
                        resource_type: msg.fileType === 'image' ? 'image' : 'raw'
                    });
                } catch (_) { }
            }
        }

        await Complaint.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Complaint deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Get unread counts for current user role
const getUnreadCounts = async (req, res) => {
    try {
        let studentUnread = 0;
        let wardenUnread = 0;

        if (req.user && req.user.role === 'student') {
            const complaints = await Complaint.find({ submittedBy: req.user._id, studentUnreadCount: { $gt: 0 } });
            studentUnread = complaints.length; // Number of chats with unread messages
            // Alternatively, if the user wants TOTAL messages count:
            // studentUnread = complaints.reduce((sum, c) => sum + c.studentUnreadCount, 0);
        } else {
            const complaints = await Complaint.find({ wardenUnreadCount: { $gt: 0 } });
            wardenUnread = complaints.length;
        }

        res.json({ success: true, data: { studentUnread, wardenUnread } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Submit feedback for a resolved complaint (Student)
const submitFeedback = async (req, res) => {
    try {
        const { feedback } = req.body;
        if (!['great', 'not-resolved'].includes(feedback)) {
            return res.status(400).json({ success: false, message: 'Invalid feedback type' });
        }

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

        // Check ownership
        if (complaint.submittedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        complaint.studentFeedback = feedback;

        const feedbackText = feedback === 'great'
            ? '✅ Student feedback: Issue resolved successfully. Thank you for your help!'
            : '⚠️ Student feedback: Issue is NOT resolved yet. Please reopen and assist further.';

        // Add system message from student
        complaint.messages.push({
            sender: req.user._id,
            content: feedbackText,
            senderRole: 'student'
        });

        // If not resolved, reopen
        if (feedback === 'not-resolved') {
            complaint.status = 'in-progress';
            complaint.wardenUnreadCount += 1;
        }

        complaint.updatedAt = Date.now();
        await complaint.save();

        const updated = await Complaint.findById(req.params.id)
            .populate('submittedBy', 'name email studentId')
            .populate('messages.sender', 'name role');

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    createComplaint,
    getMyComplaints,
    getComplaints,
    getComplaintById,
    addMessage,
    updateStatus,
    sendToDean,
    deleteComplaint,
    getUnreadCounts,
    submitFeedback
};