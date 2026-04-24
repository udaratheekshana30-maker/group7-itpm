import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineClipboardDocumentList,
  HiOutlineUser,
  HiOutlineTrash
} from 'react-icons/hi2';

const API = 'http://localhost:5000/api';

const statusConfig = {
  open: { label: 'Open', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  'in-progress': { label: 'In Progress', color: 'bg-[#FAB95B]/10 text-[#FAB95B] border-[#FAB95B]/20', dot: 'bg-[#FAB95B]' },
  resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' }
};

export default function Complaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchComplaints();
    const interval = setInterval(() => fetchComplaints(false), 2000); // Poll every 2s

    const handleRefresh = () => fetchComplaints(false);
    window.addEventListener('nmh_unread_refresh', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('nmh_unread_refresh', handleRefresh);
    };
  }, []);

  const fetchComplaints = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // No auth needed — warden dashboard is open
      const res = await fetch(`${API}/complaints`);
      const data = await res.json();
      if (data.success) setComplaints(data.data);
    } catch { /* silent */ }
    finally { if (showLoading) setLoading(false); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) return;

    try {
      const res = await fetch(`${API}/complaints/${id}/warden`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setComplaints(prev => prev.filter(c => c._id !== id));
      } else {
        alert(data.message || 'Failed to delete complaint');
      }
    } catch (err) {
      alert('Error deleting complaint');
    }
  };

  const filtered = complaints
    .filter(c => filter === 'all' || c.status === filter)
    .filter(c => categoryFilter === 'all' || c.category === categoryFilter)
    .filter(c =>
      !search ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.submittedBy?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.submittedBy?.studentId?.toLowerCase().includes(search.toLowerCase())
    );

  const categories = ['all', ...new Set(complaints.map(c => c.category).filter(Boolean))];

  const counts = {
    all: complaints.length,
    open: complaints.filter(c => c.status === 'open').length,
    'in-progress': complaints.filter(c => c.status === 'in-progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  return (
    <div className="p-4 sm:p-10 space-y-10 w-full animate-fade-in transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="page-header mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-transform hover:scale-105">
          <HiOutlineChatBubbleLeftRight className="text-2xl" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Hostel <span className="text-indigo-500 italic">Complaints</span></h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Manage and respond to student grievances and issues</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { key: 'all', label: 'Total', icon: HiOutlineClipboardDocumentList, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' },
          { key: 'open', label: 'Open', icon: HiOutlineExclamationCircle, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' },
          { key: 'in-progress', label: 'In Progress', icon: HiOutlineClock, color: 'text-[#FAB95B] dark:text-[#FAB95B] bg-[#FAB95B]/10 dark:bg-[#FAB95B]/20' },
          { key: 'resolved', label: 'Resolved', icon: HiOutlineCheckCircle, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
        ].map(({ key, label, icon: Icon, color }) => (
          <div
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-2xl p-5 ${color} shadow-sm cursor-pointer hover:scale-[1.02] transition-all border border-transparent ${filter === key ? 'ring-2 ring-offset-2 ring-indigo-400' : ''}`}
          >
            <Icon className="text-2xl mb-2" />
            <div className="text-3xl font-black">{counts[key]}</div>
            <div className="text-xs font-bold uppercase tracking-wide opacity-70 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <div className="flex gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-sm">
          {['all', 'open', 'in-progress', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all capitalize ${filter === f ? 'bg-[#FAB95B] text-[#1A3263] shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              {f === 'all' ? 'All' : f.replace('-', ' ')}
            </button>
          ))}
        </div>
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="pl-4 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm font-bold shadow-sm outline-none focus:border-indigo-400 appearance-none"
          >
            <option value="all">All Categories</option>
            {categories.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, student name or ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition shadow-sm"
          />
        </div>
        <button
          onClick={fetchComplaints}
          className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-16 text-center shadow-sm">
          <HiOutlineClipboardDocumentList className="text-5xl text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-500 mb-2">No complaints found</h3>
          <p className="text-slate-400 text-sm">Students haven't submitted any complaints yet, or try adjusting filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const sConf = statusConfig[c.status] || statusConfig.open;
            const lastMsg = c.messages?.[c.messages.length - 1];
            const msgCount = c.messages?.length || 0;

            return (
              <div
                key={c._id}
                onClick={() => navigate(`/complaints/${c._id}`)}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                {/* Student Avatar */}
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {c.submittedBy?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{c.title}</span>
                    {c.status === 'open' && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" title="Needs attention" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <HiOutlineUser className="text-xs" />
                      {c.submittedBy?.name || 'Unknown Student'}
                    </span>
                    {c.submittedBy?.studentId && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{c.submittedBy.studentId}</span>
                      </>
                    )}
                    {lastMsg?.content && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-xs">{lastMsg.content.slice(0, 70)}{lastMsg.content.length > 70 ? '...' : ''}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side */}
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  {c.wardenUnreadCount > 0 && (
                    <div className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-rose-500/20 mb-1">
                      {c.wardenUnreadCount}
                    </div>
                  )}
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${sConf.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sConf.dot}`} />
                    {sConf.label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(c.updatedAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <HiOutlineChatBubbleLeftRight className="text-xs" /> {msgCount} msg{msgCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Delete/Action Area */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, c._id)}
                    className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors flex items-center justify-center text-lg shadow-sm"
                    title="Delete Complaint"
                  >
                    <HiOutlineTrash />
                  </button>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-900/50 dark:group-hover:text-indigo-400 flex items-center justify-center text-slate-300 transition-colors flex-shrink-0 text-base font-bold">
                    →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}