const Notice = require('../models/Notice.js');
const { cloudinary } = require('../config/cloudinary.js');

exports.createNotice = async (req, res) => {
  try {
    if (!req.user || req.user.role?.toLowerCase() !== 'warden') {
      return res.status(403).json({ success: false, msg: `Only wardens can create notices. (Current Role: ${req.user?.role || 'Guest'})` });
    }

    const { title, content } = req.body;

    // Build attachments array from all uploaded files
    const attachments = (req.files || []).map(file => ({
      url: file.path,
      publicId: file.filename,
      type: file.mimetype.startsWith('image/') ? 'image' : 'document',
    }));

    // Legacy compat — keep first attachment in old fields too
    const first = attachments[0];

    const notice = await Notice.create({
      title,
      content,
      attachments,
      attachmentUrl: first ? first.url : '',
      attachmentPublicId: first ? first.publicId : '',
      attachmentType: first ? first.type : 'none',
      createdBy: req.user.id || req.user._id,
    });

    const populated = await notice.populate('createdBy', 'name role');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

exports.getNotices = async (req, res) => {
  try {
    const notices = await Notice.find({ isActive: true })
      .populate('createdBy', 'name role')
      .sort('-createdAt');
    res.json({ success: true, data: notices });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

exports.updateNotice = async (req, res) => {
  try {
    if (req.user.role?.toLowerCase() !== 'warden') {
      return res.status(403).json({ success: false, msg: 'Forbidden' });
    }

    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ success: false, msg: 'Notice not found' });

    const updateData = {
      title: req.body.title ?? notice.title,
      content: req.body.content ?? notice.content,
      updatedAt: Date.now(),
    };

    // If new files are uploaded, add them to the attachments array
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        url: file.path,
        publicId: file.filename,
        type: file.mimetype.startsWith('image/') ? 'image' : 'document',
      }));

      // Decide: if client sends ?replace=true, replace all; else append
      if (req.query.replace === 'true') {
        // Delete old cloudinary files
        for (const att of notice.attachments || []) {
          if (att.publicId) {
            try { await cloudinary.uploader.destroy(att.publicId, { resource_type: att.type === 'image' ? 'image' : 'raw' }); } catch (_) { }
          }
        }
        updateData.attachments = newAttachments;
      } else {
        updateData.attachments = [...(notice.attachments || []), ...newAttachments];
      }

      // Update legacy fields to first attachment
      const first = updateData.attachments[0];
      if (first) {
        updateData.attachmentUrl = first.url;
        updateData.attachmentPublicId = first.publicId;
        updateData.attachmentType = first.type;
      }
    }

    // Allow removing specific attachment by index: body.removeIndex
    if (req.body.removeIndex !== undefined) {
      const idx = parseInt(req.body.removeIndex);
      const current = notice.attachments || [];
      const toRemove = current[idx];
      if (toRemove?.publicId) {
        try { await cloudinary.uploader.destroy(toRemove.publicId, { resource_type: toRemove.type === 'image' ? 'image' : 'raw' }); } catch (_) { }
      }
      updateData.attachments = current.filter((_, i) => i !== idx);
      const newFirst = updateData.attachments[0];
      updateData.attachmentUrl = newFirst ? newFirst.url : '';
      updateData.attachmentPublicId = newFirst ? newFirst.publicId : '';
      updateData.attachmentType = newFirst ? newFirst.type : 'none';
    }

    const updatedNotice = await Notice.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after', runValidators: true })
      .populate('createdBy', 'name role');
    res.json({ success: true, data: updatedNotice });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

exports.deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ success: false, msg: 'Notice not found' });

    // Delete all Cloudinary files
    for (const att of notice.attachments || []) {
      if (att.publicId) {
        try { await cloudinary.uploader.destroy(att.publicId, { resource_type: att.type === 'image' ? 'image' : 'raw' }); } catch (_) { }
      }
    }

    await Notice.findByIdAndDelete(req.params.id);
    res.json({ success: true, msg: 'Notice deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};