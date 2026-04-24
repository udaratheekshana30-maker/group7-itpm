import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlineMegaphone,
    HiOutlineCalendarDays,
    HiOutlinePaperClip,
    HiOutlineArrowTopRightOnSquare,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineXMark,
} from 'react-icons/hi2';

const API = '/api';

// Normalize attachments from a notice object
const normalizeAttachments = (notice) => {
    if (notice.attachments && notice.attachments.length > 0) return notice.attachments;
    if (notice.attachmentUrl) return [{ url: notice.attachmentUrl, type: notice.attachmentType, publicId: notice.attachmentPublicId }];
    return [];
};

/* ── Full-Page Image Carousel ───────────────────────────── */
const ImageCarousel = ({ images, initialIndex = 0, onClose }) => {
    const [idx, setIdx] = useState(initialIndex);
    const touchStartX = useRef(null);

    const prev = useCallback(() => setIdx(i => (i - 1 + images.length) % images.length), [images.length]);
    const next = useCallback(() => setIdx(i => (i + 1) % images.length), [images.length]);

    // Keyboard support
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [prev, next, onClose]);

    const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
        touchStartX.current = null;
    };

    return (
        <div
            className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* Close */}
            <button onClick={onClose}
                className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10">
                <HiOutlineXMark className="text-2xl" />
            </button>

            {/* Counter */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-bold">
                {idx + 1} / {images.length}
            </div>

            {/* Image */}
            <img
                src={images[idx].url}
                alt={`Photo ${idx + 1}`}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl select-none"
                draggable={false}
            />

            {/* Arrows */}
            {images.length > 1 && (
                <>
                    <button onClick={prev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/25 transition-colors">
                        <HiOutlineChevronLeft className="text-3xl" />
                    </button>
                    <button onClick={next}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/25 transition-colors">
                        <HiOutlineChevronRight className="text-3xl" />
                    </button>

                    {/* Dot strip */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                        {images.map((_, i) => (
                            <button key={i} onClick={() => setIdx(i)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'bg-white w-6' : 'bg-white/40 w-1.5'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

/* ── Inline carousel for detail page ───────────────────────── */
const DetailCarousel = ({ images, onOpen }) => {
    const [idx, setIdx] = useState(0);
    const touchStartX = useRef(null);

    const prev = useCallback(() => setIdx(i => (i - 1 + images.length) % images.length), [images.length]);
    const next = useCallback(() => setIdx(i => (i + 1) % images.length), [images.length]);

    const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
        touchStartX.current = null;
    };

    return (
        <div className="relative w-full overflow-hidden rounded-3xl shadow-2xl bg-black" style={{ maxHeight: '520px' }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* Images */}
            {images.map((img, i) => (
                <img
                    key={i}
                    src={img.url}
                    alt={`Photo ${i + 1}`}
                    onClick={() => onOpen(i)}
                    className={`w-full object-cover cursor-zoom-in transition-opacity duration-700 select-none ${i === idx ? 'opacity-100 relative' : 'opacity-0 absolute inset-0'}`}
                    style={{ maxHeight: '520px' }}
                    draggable={false}
                />
            ))}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

            {/* Expand hint */}
            <span className="absolute bottom-4 right-4 text-white text-[9px] font-black uppercase tracking-widest bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5 pointer-events-none">
                <HiOutlineArrowTopRightOnSquare className="text-sm" /> Click to expand
            </span>

            {/* Arrows */}
            {images.length > 1 && (
                <>
                    <button onClick={prev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors">
                        <HiOutlineChevronLeft className="text-2xl" />
                    </button>
                    <button onClick={next}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors">
                        <HiOutlineChevronRight className="text-2xl" />
                    </button>

                    {/* Counter */}
                    <div className="absolute top-4 left-4 text-white text-xs font-black bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                        {idx + 1} / {images.length}
                    </div>

                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {images.map((_, i) => (
                            <button key={i} onClick={() => setIdx(i)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'bg-white w-6' : 'bg-white/50 w-1.5'}`}
                            />
                        ))}
                    </div>

                    {/* Thumbnail strip */}
                    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-2">
                        {images.map((img, i) => (
                            <button key={i} onClick={() => setIdx(i)}
                                className={`w-12 h-8 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-white shadow-lg scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

/* ── Main Page ───────────────────────────────────────────── */
const NoticeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [notice, setNotice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lightboxIndex, setLightboxIndex] = useState(null); // null = closed

    useEffect(() => { fetchNotice(); }, [id]);

    const fetchNotice = async () => {
        try {
            const res = await fetch(`${API}/notices`);
            const data = await res.json();
            if (data.success) {
                const found = data.data.find(n => n._id === id);
                if (found) setNotice(found);
                else setError('Notice not found.');
            } else setError('Failed to load notice.');
        } catch { setError('Could not connect to the server.'); }
        finally { setLoading(false); }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 text-center p-8">
            <div className="w-20 h-20 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center text-4xl">!</div>
            <p className="text-lg font-bold text-slate-600">{error}</p>
            <button onClick={() => navigate(-1)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors">← Go Back</button>
        </div>
    );

    const attachments = normalizeAttachments(notice);
    const images = attachments.filter(a => a.type === 'image');
    const docs = attachments.filter(a => a.type !== 'image');

    return (
        <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Lightbox */}
            {lightboxIndex !== null && (
                <ImageCarousel
                    images={images}
                    initialIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}

            {/* Top nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                    <HiOutlineArrowLeft className="text-lg" />
                </button>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => navigate('/')}>Home</span>
                    <span>/</span>
                    <span className="text-slate-800 truncate max-w-xs">{notice.title}</span>
                </div>
            </nav>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-28 pb-24 space-y-10">
                {/* Badge */}
                <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                        <HiOutlineMegaphone /> Official Notice
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight">
                    {notice.title}
                </h1>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-400 pb-8 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <HiOutlineCalendarDays className="text-indigo-400" />
                        <span>
                            {new Date(notice.createdAt).toLocaleDateString('en-US', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">
                            {notice.createdBy?.name?.charAt(0) || 'W'}
                        </div>
                        <span className="font-bold text-slate-600">{notice.createdBy?.name || 'Warden'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            {notice.createdBy?.role || 'Warden'}
                        </span>
                    </div>
                </div>

                {/* Photo carousel */}
                {images.length > 0 && (
                    <DetailCarousel images={images} onOpen={setLightboxIndex} />
                )}

                {/* Body */}
                <div className="text-slate-600 text-lg leading-relaxed whitespace-pre-line">
                    {notice.content}
                </div>

                {/* Documents */}
                {docs.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Attachments</h3>
                        {docs.map((doc, i) => (
                            <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                                className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-3xl shadow-sm hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-md transition-all group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                    <HiOutlinePaperClip className="text-indigo-600 text-xl" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">Attached Document {docs.length > 1 ? i + 1 : ''}</div>
                                    <div className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">Click to View / Download</div>
                                </div>
                                <HiOutlineArrowTopRightOnSquare className="text-slate-300 group-hover:text-indigo-500 text-xl transition-colors" />
                            </a>
                        ))}
                    </div>
                )}

                {/* Back */}
                <div className="pt-6">
                    <button onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 active:scale-95 transition-all">
                        <HiOutlineArrowLeft /> Back to Notices
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoticeDetail;
