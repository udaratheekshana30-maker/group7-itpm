import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api';
import {
  HiOutlineMegaphone,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePhoto,
  HiOutlineDocumentArrowUp,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlinePencilSquare,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

/* ── Helpers ──────────────────────────────────────────────── */

// Normalize a notice to always have an `attachments` array
const normalizeAttachments = (notice) => {
  if (notice.attachments && notice.attachments.length > 0) return notice.attachments;
  if (notice.attachmentUrl) return [{ url: notice.attachmentUrl, type: notice.attachmentType, publicId: notice.attachmentPublicId }];
  return [];
};

/* ── Auto-Slideshow for a notice card ─────────────────────── */
const NoticeSlideshow = ({ attachments }) => {
  const images = attachments.filter(a => a.type === 'image');
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setIdx(i => (i + 1) % images.length), 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="relative overflow-hidden" style={{ paddingBottom: '56.25%' }}>
      {images.map((img, i) => (
        <img
          key={i}
          src={img.url}
          alt={`Slide ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Notice Form Modal (Create & Edit) ───────────────────── */
const NoticeFormModal = ({ notice, onClose, onSaved }) => {
  const isEdit = !!notice;
  const [title, setTitle] = useState(notice?.title || '');
  const [content, setContent] = useState(notice?.content || '');

  // Existing attachments from server
  const [existingAttachments, setExistingAttachments] = useState(normalizeAttachments(notice || {}));
  // New files selected locally
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 5 - existingAttachments.length;
    if (files.length > remaining) {
      toast.error(`You can only add ${remaining} more image(s). Max 5 total.`);
      return;
    }
    setNewFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setNewPreviews(prev => [...prev, { src: reader.result, name: file.name }]);
        reader.readAsDataURL(file);
      } else {
        setNewPreviews(prev => [...prev, { src: null, name: file.name }]);
      }
    });
  };

  const removeNewFile = (idx) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
    setNewPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExisting = async (idx) => {
    if (!isEdit) return;
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('content', content);
      fd.append('removeIndex', idx);
      const res = await api.updateNotice(notice._id, fd);
      if (res.success) {
        setExistingAttachments(normalizeAttachments(res.data));
        toast.success('Image removed');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to remove image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return toast.error('Title and content are required.');
    setIsSubmitting(true);

    const fd = new FormData();
    fd.append('title', title);
    fd.append('content', content);
    newFiles.forEach(f => fd.append('attachments', f));

    try {
      let res;
      if (isEdit) {
        res = await api.updateNotice(notice._id, fd);
      } else {
        res = await api.createNotice(fd);
      }
      if (res.success) {
        toast.success(isEdit ? 'Notice updated!' : 'Notice published!');
        onSaved(res.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save notice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCount = existingAttachments.length + newFiles.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col border dark:border-slate-800">
        {/* Header stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-[#FAB95B] to-indigo-600" />

        <div className="p-8 overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{isEdit ? 'Edit Notice' : 'New Announcement'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors border-none bg-transparent cursor-pointer">
              <HiOutlineXMark className="text-xl text-slate-400 dark:text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Title *</label>
              <input
                type="text" required
                placeholder="e.g. Maintenance Scheduled for Wing A"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* Content */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Content *</label>
              <textarea
                required rows="4"
                placeholder="Detailed description of the announcement..."
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none resize-none"
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>

            {/* Existing attachments (edit mode) */}
            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Current Photos</label>
                <div className="grid grid-cols-3 gap-3">
                  {existingAttachments.map((att, i) => (
                    <div key={i} className="relative group rounded-2xl overflow-hidden aspect-square bg-slate-100 dark:bg-slate-800">
                      {att.type === 'image'
                        ? <img src={att.url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500"><HiOutlineDocumentArrowUp className="text-3xl" /></div>
                      }
                      <button
                        type="button"
                        onClick={() => removeExisting(i)}
                        className="absolute top-1 right-1 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 text-sm"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New files preview */}
            {newPreviews.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">New Photos to Upload</label>
                <div className="grid grid-cols-3 gap-3">
                  {newPreviews.map((p, i) => (
                    <div key={i} className="relative group rounded-2xl overflow-hidden aspect-square bg-slate-100 dark:bg-slate-800">
                      {p.src
                        ? <img src={p.src} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-bold px-2 text-center">{p.name}</div>
                      }
                      <button
                        type="button"
                        onClick={() => removeNewFile(i)}
                        className="absolute top-1 right-1 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 text-sm"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload area */}
            {totalCount < 5 && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                  Add Photos / Document {totalCount > 0 ? `(${totalCount}/5)` : '(optional, up to 5)'}
                </label>
                <div
                  onClick={() => fileInputRef.current.click()}
                  className="group h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 rounded-[2rem] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <input
                    type="file" ref={fileInputRef} className="hidden"
                    multiple accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    <HiOutlineDocumentArrowUp />
                  </div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Click to add images or documents</p>
                </div>
              </div>
            )}

            <button
              type="submit" disabled={isSubmitting}
              className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-slate-800 dark:hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-slate-200 dark:shadow-none border-none cursor-pointer"
            >
              {isSubmitting ? (
                <><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <>{isEdit ? 'Save Changes' : 'Publish Notice'} <HiOutlineMegaphone /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ── Main Notices Page ───────────────────────────────────── */
const Notices = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);

  useEffect(() => {
    fetchNotices();
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') setFormOpen(true);
  }, [location]);

  const fetchNotices = async () => {
    try {
      const res = await api.getNotices();
      if (res.success) setNotices(res.data);
    } catch { toast.error('Failed to load notices'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditingNotice(null); setFormOpen(true); };
  const openEdit = (n) => { setEditingNotice(n); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditingNotice(null); };

  const handleSaved = (saved) => {
    setNotices(prev => {
      const exists = prev.find(n => n._id === saved._id);
      return exists ? prev.map(n => n._id === saved._id ? saved : n) : [saved, ...prev];
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.deleteNotice(id);
      toast.success('Notice deleted');
      setNotices(prev => prev.filter(n => n._id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="p-4 sm:p-10 space-y-10 w-full animate-fade-in transition-colors lg:max-px-0">
      {/* Header */}
      <div className="page-header mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none transition-transform hover:scale-105">
            <HiOutlineMegaphone className="text-2xl" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Hostel <span className="text-indigo-500 italic">Notices</span></h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Manage and publish announcements for all students</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="px-10 py-4 bg-[#FAB95B] text-[#1A3263] rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#FAB95B]/40 cursor-pointer border-none"
        >
          <HiOutlinePlus className="text-2xl" />
          <span className="text-lg">Create Notice</span>
        </button>
      </div>

      {/* Form Modal */}
      {formOpen && (
        <NoticeFormModal
          notice={editingNotice}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notices.map((notice) => {
            const atts = normalizeAttachments(notice);
            const docs = atts.filter(a => a.type !== 'image');
            return (
              <div
                key={notice._id}
                className="group bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-800 flex flex-col overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300"
                onClick={() => navigate(`/notice/${notice._id}`)}
              >
                {/* Auto-slideshow */}
                <NoticeSlideshow attachments={atts} />

                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex items-center justify-between mb-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
                      <HiOutlineMegaphone /> Official
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{notice.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5 flex-grow line-clamp-3">{notice.content}</p>

                  {/* Document attachment */}
                  {docs.map((doc, i) => (
                    <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all mb-3 text-decoration-none"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                        <HiOutlineDocumentArrowUp className="text-indigo-500 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Document</div>
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-200">Click to View / Download</div>
                      </div>
                    </a>
                  ))}

                  <div className="pt-5 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                        {notice.createdBy?.name?.charAt(0) || 'W'}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Warden</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(notice); }}
                        className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                        title="Edit"
                      >
                        <HiOutlinePencilSquare className="text-xl" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(notice._id); }}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        title="Delete"
                      >
                        <HiOutlineTrash className="text-xl" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] py-24 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 text-slate-200 dark:text-slate-700 rounded-full flex items-center justify-center text-4xl mb-6">
            <HiOutlineMegaphone />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">No Announcements Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">Click the button below to publish your first notice.</p>
          <button
            onClick={openCreate}
            className="px-8 py-4 bg-[#FAB95B] text-[#1A3263] rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#FAB95B]/30 cursor-pointer"
          >
            <HiOutlinePlus className="text-xl" /> Create Notice
          </button>
        </div>
      )}
    </div>
  );
};

export default Notices;