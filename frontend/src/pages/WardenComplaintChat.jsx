import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlinePaperAirplane,
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineExclamationCircle,
    HiOutlineChevronDown,
    HiOutlineEnvelopeOpen,
    HiOutlinePaperClip,
    HiOutlineXMark,
    HiOutlineDocumentText,
    HiOutlineTrash
} from 'react-icons/hi2';

const API = 'http://localhost:5000/api';

const statusConfig = {
    open: { label: 'Open', color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30', dot: 'bg-red-500' },
    'in-progress': { label: 'In Progress', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30', dot: 'bg-amber-500' },
    resolved: { label: 'Resolved', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30', dot: 'bg-emerald-500' }
};

export default function WardenComplaintChat() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [error, setError] = useState('');
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const prevMessagesLength = useRef(0);
    
    useEffect(() => {
        prevMessagesLength.current = 0;
    }, [id]);

    useEffect(() => {
        fetchComplaint();
        const interval = setInterval(() => fetchComplaint(false), 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        const currentLength = complaint?.messages?.length || 0;
        if (currentLength > prevMessagesLength.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMessagesLength.current = currentLength;
    }, [complaint?.messages]);

    const fetchComplaint = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            // No auth needed — warden dashboard is open
            const res = await fetch(`${API}/complaints/${id}`);
            const data = await res.json();
            if (data.success) {
                setComplaint(data.data);
                // Trigger unread count refresh in navigation
                window.dispatchEvent(new CustomEvent('nmh_unread_refresh'));
            }
            else setError(data.message || 'Failed to load complaint');
        } catch {
            setError('Failed to load complaint. Is the backend running?');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const sendMessage = async () => {
        if ((!message.trim() && !selectedFile) || sending) return;
        setSending(true);
        try {
            const formData = new FormData();
            if (message.trim()) formData.append('content', message.trim());
            if (selectedFile) formData.append('file', selectedFile);

            // Warden message — no auth token needed
            const res = await fetch(`${API}/complaints/${id}/message`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setComplaint(data.data);
                setMessage('');
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                // Trigger unread count refresh
                window.dispatchEvent(new CustomEvent('nmh_unread_refresh'));
            }
            else setError(data.message);
        } catch { setError('Failed to send message'); }
        finally { setSending(false); }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError('File too large (max 10MB)');
                return;
            }
            setSelectedFile(file);
        }
    };

    const updateStatus = async (newStatus) => {
        setStatusUpdating(true);
        setShowStatusMenu(false);
        try {
            const res = await fetch(`${API}/complaints/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) setComplaint(prev => ({ ...prev, status: newStatus }));
        } catch { setError('Failed to update status'); }
        finally { setStatusUpdating(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) return;

        try {
            const res = await fetch(`${API}/complaints/${id}/warden`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                navigate('/complaints');
            } else {
                setError(data.message || 'Failed to delete complaint');
            }
        } catch (err) {
            setError('Error deleting complaint');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <p className="text-red-500 mb-4 font-medium">{error}</p>
                <button onClick={() => navigate('/complaints')} className="text-indigo-600 font-bold underline">← Back to Complaints</button>
            </div>
        </div>
    );

    const status = statusConfig[complaint?.status] || statusConfig.open;

    return (
        <div className="flex flex-col h-[calc(100vh-70px)] bg-slate-50 dark:bg-slate-950" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 flex items-center gap-4 shadow-sm flex-shrink-0">
                <button
                    onClick={() => navigate('/complaints')}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <HiOutlineArrowLeft className="text-lg" />
                </button>

                {/* Student Avatar */}
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {complaint?.submittedBy?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>

                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">{complaint?.title}</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {complaint?.submittedBy?.name || 'Student'}{complaint?.submittedBy?.studentId ? ` · ${complaint.submittedBy.studentId}` : ''}
                    </p>
                </div>

                {/* Status Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                        disabled={statusUpdating}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${status.color}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                        {statusUpdating ? 'Updating...' : status.label}
                        <HiOutlineChevronDown className={`text-sm transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showStatusMenu && (
                        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 w-44">
                            {Object.entries(statusConfig).map(([key, val]) => (
                                <button
                                    key={key}
                                    onClick={() => updateStatus(key)}
                                    className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${complaint?.status === key ? 'bg-slate-50 dark:bg-slate-700' : ''}`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${val.dot}`} />
                                    {val.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleDelete}
                    className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                    title="Delete Complaint"
                >
                    <HiOutlineTrash className="text-lg" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4" onClick={() => setShowStatusMenu(false)}>
                {complaint?.messages?.length === 0 && (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-600">
                        <HiOutlineEnvelopeOpen className="text-4xl mx-auto mb-3" />
                        <p className="text-sm font-medium">No messages yet. Reply below to start the conversation.</p>
                    </div>
                )}

                {complaint?.messages?.map((msg, idx) => {
                    // Warden is the SENDER → right side. Student is RECEIVER → left side.
                    const isWarden = msg.senderRole === 'warden';
                    return (
                        <div key={idx} className={`flex ${isWarden ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[72%] flex flex-col gap-1 ${isWarden ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${isWarden
                                    ? 'bg-indigo-600 text-white rounded-br-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-sm'
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
                                                    className={`flex items-center gap-3 p-3 rounded-xl border ${isWarden ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600 text-slate-700 dark:text-slate-200'} hover:bg-opacity-80 transition-all`}
                                                >
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isWarden ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-slate-600 text-indigo-600 dark:text-indigo-400'}`}>
                                                        <HiOutlineDocumentText className="text-xl" />
                                                    </div>
                                                    <span className="text-xs font-bold truncate">View Document</span>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    {msg.content}
                                </div>
                                <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 ${isWarden ? 'flex-row-reverse' : ''}`}>
                                    <span className="font-semibold">{isWarden ? 'You (Warden)' : complaint?.submittedBy?.name || 'Student'}</span>
                                    <span>·</span>
                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span>·</span>
                                    <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex-shrink-0">
                <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                        {selectedFile && (
                            <div className="absolute bottom-full mb-3 left-0 right-0 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-3 shadow-lg flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                                            {selectedFile.type.startsWith('image/') ? (
                                                <img
                                                    src={URL.createObjectURL(selectedFile)}
                                                    className="w-full h-full object-cover rounded-xl"
                                                    alt="Preview"
                                                />
                                            ) : (
                                                <HiOutlineDocumentText className="text-xl" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{selectedFile.name}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedFile(null)}
                                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                        <HiOutlineXMark />
                                    </button>
                                </div>
                            </div>
                        )}
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*,.pdf,.doc,.docx"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute left-3 bottom-3 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                            <HiOutlinePaperClip className="text-xl" />
                        </button>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your reply to the student..."
                            rows={1}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm resize-none outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400/20 transition-all font-medium"
                            style={{ maxHeight: 120, minHeight: '52px' }}
                        />
                    </div>
                    <button
                        onClick={sendMessage}
                        disabled={(!message.trim() && !selectedFile) || sending}
                        className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20 flex-shrink-0"
                    >
                        {sending
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <HiOutlinePaperAirplane className="text-lg" />
                        }
                    </button>
                </div>
                {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
            </div>
        </div>
    );
}
