import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlinePaperAirplane,
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineExclamationCircle,
    HiOutlineChatBubbleLeftRight,
    HiOutlinePaperClip,
    HiOutlineXMark,
    HiOutlineDocumentText,
    HiOutlineTrash,
    HiOutlineHandThumbUp,
    HiOutlineFaceSmile
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const API = '/api';

const statusConfig = {
    open: { label: 'Open', color: 'bg-rose-100 text-rose-700', icon: HiOutlineExclamationCircle },
    'in-progress': { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: HiOutlineClock },
    resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700', icon: HiOutlineCheckCircle }
};

export default function StudentComplaintChat() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [feedbackGiven, setFeedbackGiven] = useState(null); // null | 'great' | 'not-resolved'
    const [sendingFeedback, setSendingFeedback] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!authLoading && !user) navigate('/');
        if (user) {
            fetchComplaint();
            const interval = setInterval(fetchComplaint, 5000);
            return () => clearInterval(interval);
        }
    }, [id, user, authLoading]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [complaint?.messages]);

    const fetchComplaint = async () => {
        try {
            const res = await fetch(`${API}/complaints/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                setComplaint(data.data);
                if (data.data.studentFeedback) setFeedbackGiven(data.data.studentFeedback);
            } else setError(data.message);
        } catch {
            setError('Failed to load complaint');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if ((!message.trim() && !selectedFile) || sending) return;
        setSending(true);
        try {
            const formData = new FormData();
            if (message.trim()) formData.append('content', message.trim());
            if (selectedFile) formData.append('file', selectedFile);

            const res = await fetch(`${API}/complaints/${id}/message-student`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${user.token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setComplaint(data.data);
                setMessage('');
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    // Send feedback to backend (updates status and records message)
    const sendFeedback = async (type) => {
        if (sendingFeedback) return;
        setSendingFeedback(true);
        try {
            const res = await fetch(`${API}/complaints/${id}/feedback`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify({ feedback: type })
            });

            const data = await res.json();
            if (data.success) {
                setComplaint(data.data);
                setFeedbackGiven(type);
                if (type === 'not-resolved') {
                    toast('Complaint reopened — warden has been notified.', { icon: '🔄' });
                } else {
                    toast.success('Feedback sent! Glad the issue was resolved. 🎉');
                }
            } else {
                toast.error(data.message || 'Failed to send feedback');
            }
        } catch {
            toast.error('Failed to send feedback');
        } finally {
            setSendingFeedback(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error('File too large (max 10MB)');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this complaint? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API}/complaints/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Complaint deleted');
                navigate('/student/chats');
            } else {
                toast.error(data.message || 'Failed to delete');
            }
        } catch (err) {
            toast.error('Error deleting complaint');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    if (authLoading || loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-2xl mb-4">
                <HiOutlineExclamationCircle />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Support Session Not Found</h3>
            <p className="text-slate-500 mt-2 mb-6">The complaint ID might be invalid or you don't have access.</p>
            <button onClick={() => navigate('/student/chats')} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold">Back to Chats</button>
        </div>
    );

    const status = statusConfig[complaint?.status] || statusConfig.open;
    const isResolved = complaint?.status === 'resolved';

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50">
            {/* Thread Header */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/student/chats')} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                        <HiOutlineArrowLeft className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 tracking-tight">{complaint?.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                                {status.label}
                            </div>
                            <span className="text-[10px] font-bold text-slate-300 uppercase">Ticket #{id.slice(-6).toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                <div className="hidden sm:flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-700">Warden Support</div>
                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Online</div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <HiOutlineChatBubbleLeftRight />
                    </div>
                    <button
                        onClick={handleDelete}
                        className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                        title="Delete Complaint"
                    >
                        <HiOutlineTrash className="text-xl" />
                    </button>
                </div>
            </div>

            {/* Discussion Area */}
            <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6 max-w-4xl mx-auto w-full">
                {/* Initial Description */}
                <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-[2rem] p-6 mb-10">
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">
                        <HiOutlineClock /> Ticket Opened
                    </div>
                    <p className="text-indigo-900 font-medium leading-relaxed">{complaint?.description}</p>
                </div>

                {complaint?.messages?.map((msg, idx) => {
                    const isMine = msg.senderRole === 'student';
                    return (
                        <div key={idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`max-w-[80%] sm:max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                <div className={`px-5 py-4 rounded-[1.5rem] text-sm font-medium leading-relaxed ${isMine
                                    ? 'bg-slate-900 text-white rounded-br-sm shadow-xl shadow-slate-200'
                                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm shadow-sm'
                                    }`}>
                                    {msg.fileUrl && (
                                        <div className="mb-2">
                                            {msg.fileType === 'image' ? (
                                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                                    <img
                                                        src={msg.fileUrl}
                                                        alt="Attachment"
                                                        className="max-w-full rounded-xl border border-white/10 hover:opacity-90 transition-opacity"
                                                        style={{ maxHeight: '300px' }}
                                                    />
                                                </a>
                                            ) : (
                                                <a
                                                    href={msg.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`flex items-center gap-3 p-3 rounded-xl border ${isMine ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-100 text-slate-700'} hover:bg-opacity-80 transition-all`}
                                                >
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMine ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        <HiOutlineDocumentText className="text-xl" />
                                                    </div>
                                                    <span className="text-xs font-bold truncate">View Document</span>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    {msg.content}
                                </div>
                                <div className={`flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                    <span>{isMine ? 'Verified Student' : 'Hostel Warden'}</span>
                                    <span className="opacity-30">•</span>
                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* ─── Bottom bar ─── */}
            {isResolved ? (
                <div className="bg-white border-t border-slate-100">
                    {feedbackGiven ? (
                        /* ── Confirmation after feedback ── */
                        <div className="py-6 text-center">
                            {feedbackGiven === 'great' ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl mx-auto">
                                        <HiOutlineFaceSmile />
                                    </div>
                                    <p className="text-emerald-700 text-sm font-black">Thank you for your feedback! 🎉</p>
                                    <p className="text-slate-400 text-xs font-bold">We're glad the issue was resolved.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl mx-auto">
                                        🔄
                                    </div>
                                    <p className="text-amber-700 text-sm font-black">Complaint Reopened</p>
                                    <p className="text-slate-400 text-xs font-bold">Warden has been notified to assist you further.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ── Feedback buttons ── */
                        <div className="px-6 py-5 max-w-4xl mx-auto">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
                                    <HiOutlineCheckCircle className="text-lg" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">Warden marked this as Resolved</p>
                                    <p className="text-xs text-slate-400 font-bold">Was your issue actually resolved?</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {/* ✅ Great button */}
                                <button
                                    onClick={() => sendFeedback('great')}
                                    disabled={sendingFeedback}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-white font-black text-sm hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <HiOutlineHandThumbUp className="text-lg" />
                                    {sendingFeedback ? 'Sending...' : 'Great! Issue Resolved'}
                                </button>
                                {/* ❌ Not Resolved button */}
                                <button
                                    onClick={() => sendFeedback('not-resolved')}
                                    disabled={sendingFeedback}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-rose-50 text-rose-600 border-2 border-rose-200 font-black text-sm hover:bg-rose-100 hover:border-rose-300 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <HiOutlineExclamationCircle className="text-lg" />
                                    {sendingFeedback ? 'Sending...' : 'Not Resolved Yet'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ── Normal chat input ── */
                <div className="bg-white border-t border-slate-100 p-6">
                    <div className="max-w-4xl mx-auto flex items-end gap-4">
                        <div className="flex-1 relative">
                            {selectedFile && (
                                <div className="absolute bottom-full mb-3 left-0 right-0 animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-lg flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                                {selectedFile.type.startsWith('image/') ? (
                                                    <img src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                                                ) : (
                                                    <HiOutlineDocumentText className="text-xl" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{selectedFile.name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedFile(null)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500 transition-colors">
                                            <HiOutlineXMark />
                                        </button>
                                    </div>
                                </div>
                            )}
                            <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx" />
                            <button onClick={() => fileInputRef.current?.click()} className="absolute left-4 bottom-4 p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                <HiOutlinePaperClip className="text-xl" />
                            </button>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your message..."
                                rows={1}
                                className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-none text-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none resize-none"
                                style={{ maxHeight: 120, minHeight: '56px' }}
                            />
                        </div>
                        <button
                            onClick={sendMessage}
                            disabled={!message.trim() || sending}
                            className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 disabled:opacity-30 transition-all active:scale-95 shadow-lg shadow-slate-200"
                        >
                            <HiOutlinePaperAirplane className="text-xl" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
