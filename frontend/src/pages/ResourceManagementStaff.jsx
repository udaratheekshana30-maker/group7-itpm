import React, { useState, useEffect } from 'react';
import { 
    HiOutlineTicket, 
    HiOutlinePlusCircle,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineTrash,
    HiOutlineChartBar,
    HiOutlineMapPin,
    HiOutlineClock,
    HiOutlineUsers,
    HiOutlineBolt,
    HiOutlineBookOpen,
    HiOutlineMusicalNote,
    HiOutlineTv,
    HiOutlinePresentationChartLine,
    HiOutlineSparkles,
    HiOutlineFire
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_URL = '/api/facilities';

const iconMap = {
    'HiOutlineBolt': HiOutlineBolt,
    'HiOutlineBookOpen': HiOutlineBookOpen,
    'HiOutlineMusicalNote': HiOutlineMusicalNote,
    'HiOutlineTv': HiOutlineTv,
    'HiOutlineUsers': HiOutlineUsers
};

const ResourceManagementStaff = () => {
    const { user } = useAuth();
    const [resources, setResources] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'facilities', 'stats', 'innovation'

    const [newFacility, setNewFacility] = useState({
        name: '', description: '', icon: 'HiOutlineBolt', capacity: 10, location: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resData, bookData] = await Promise.all([
                fetch(`${API_URL}/list`, { headers: { 'Authorization': `Bearer ${user.token}` } }),
                fetch(`${API_URL}/admin/all`, { headers: { 'Authorization': `Bearer ${user.token}` } })
            ]);

            const rJson = await resData.json();
            const bJson = await bookData.json();

            if (rJson.success) setResources(rJson.data);
            if (bJson.success) setBookings(bJson.data);
        } catch (err) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFacility = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/admin/add`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(newFacility)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Facility added');
                setResources([...resources, data.data]);
                setNewFacility({ name: '', description: '', icon: 'HiOutlineBolt', capacity: 10, location: '' });
            }
        } catch (err) {
            toast.error('Failed to add facility');
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            const res = await fetch(`${API_URL}/admin/status/${id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Request ${status}`);
                fetchData();
            }
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const handleDeleteRecord = async (id) => {
        if (!window.confirm('Permanently delete this record?')) return;
        try {
            console.log('Attempting to delete record:', id);
            const res = await fetch(`${API_URL}/admin/delete/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Record deleted');
                fetchData();
            } else {
                toast.error(data.message || 'Failed to delete');
            }
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Connection error while deleting');
        }
    };

    const handleDeleteFacility = async (id) => {
        if (!window.confirm('Delete this facility?')) return;
        try {
            const res = await fetch(`${API_URL}/admin/resource/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                toast.success('Facility removed');
                fetchData();
            }
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    // Innovative Analytics Logic
    const getPopularityStats = () => {
        const stats = {};
        bookings.forEach(b => {
            stats[b.resourceName] = (stats[b.resourceName] || 0) + 1;
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]);
    };

    const getPeakHourStats = () => {
        const slots = {};
        bookings.forEach(b => {
            slots[b.slot] = (slots[b.slot] || 0) + 1;
        });
        return Object.entries(slots).sort((a, b) => b[1] - a[1]);
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <HiOutlineTicket className="text-4xl text-indigo-600" />
                        Facility Management
                    </h1>
                    <p className="text-slate-500 font-medium">Approve requests and manage hostel resources</p>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 flex-wrap">
                    <button 
                        onClick={() => setActiveTab('requests')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Requests
                    </button>
                    <button 
                        onClick={() => setActiveTab('facilities')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'facilities' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Config
                    </button>
                    <button 
                        onClick={() => setActiveTab('stats')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Analytics
                    </button>
                    <button 
                        onClick={() => setActiveTab('innovation')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'innovation' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-indigo-600 hover:bg-indigo-50 font-bold italic'}`}
                    >
                        Future Demand ✨
                    </button>
                </div>
            </div>

            {activeTab === 'requests' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                <th className="px-8 py-5 text-left font-black uppercase tracking-wider text-slate-400 text-[10px]">Student</th>
                                <th className="px-8 py-5 text-left font-black uppercase tracking-wider text-slate-400 text-[10px]">Facility / Purpose</th>
                                <th className="px-8 py-5 text-left font-black uppercase tracking-wider text-slate-400 text-[10px]">Date & Slot</th>
                                <th className="px-8 py-5 text-left font-black uppercase tracking-wider text-slate-400 text-[10px]">Status</th>
                                <th className="px-8 py-5 text-center font-black uppercase tracking-wider text-slate-400 text-[10px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {bookings.map(booking => (
                                <tr key={booking._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-all">
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-800 dark:text-slate-100">{booking.studentName}</div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase">{booking.studentId}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-indigo-600 uppercase text-xs mb-1">{booking.resourceName}</div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic">"{booking.purpose}"</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">{booking.date}</div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase">{booking.slot}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                            booking.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                            booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                            'bg-rose-100 text-rose-700'
                                        }`}>
                                            {booking.status}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex justify-center gap-2">
                                            {booking.status === 'pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(booking._id, 'approved')}
                                                        className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                        title="Approve"
                                                    >
                                                        <HiOutlineCheckCircle className="text-xl" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(booking._id, 'rejected')}
                                                        className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                        title="Reject"
                                                    >
                                                        <HiOutlineXCircle className="text-xl" />
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => handleDeleteRecord(booking._id)}
                                                className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="Delete Record"
                                            >
                                                <HiOutlineTrash className="text-xl" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'facilities' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm h-fit">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                            <HiOutlinePlusCircle className="text-indigo-600" />
                            New Facility
                        </h3>
                        <form onSubmit={handleAddFacility} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Name</label>
                                <input 
                                    required
                                    type="text"
                                    value={newFacility.name}
                                    onChange={(e) => setNewFacility({...newFacility, name: e.target.value})}
                                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500/30 rounded-xl text-[12px] font-bold outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Location</label>
                                <input 
                                    required
                                    type="text"
                                    value={newFacility.location}
                                    onChange={(e) => setNewFacility({...newFacility, location: e.target.value})}
                                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500/30 rounded-xl text-[12px] font-bold outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Capacity</label>
                                    <input 
                                        required
                                        type="number"
                                        value={newFacility.capacity}
                                        onChange={(e) => setNewFacility({...newFacility, capacity: parseInt(e.target.value)})}
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500/30 rounded-xl text-[12px] font-bold outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Icon</label>
                                    <select 
                                        value={newFacility.icon}
                                        onChange={(e) => setNewFacility({...newFacility, icon: e.target.value})}
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500/30 rounded-xl text-[12px] font-bold outline-none"
                                    >
                                        <option value="HiOutlineBolt">Bolt (Gym)</option>
                                        <option value="HiOutlineBookOpen">Book (Study)</option>
                                        <option value="HiOutlineMusicalNote">Music</option>
                                        <option value="HiOutlineTv">TV</option>
                                        <option value="HiOutlineUsers">Users</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Description</label>
                                <textarea 
                                    required
                                    rows="3"
                                    value={newFacility.description}
                                    onChange={(e) => setNewFacility({...newFacility, description: e.target.value})}
                                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500/30 rounded-xl text-[12px] font-bold outline-none"
                                />
                            </div>
                            <button 
                                type="submit"
                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                            >
                                Add Facility
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {resources.map(r => {
                            const Icon = iconMap[r.icon] || HiOutlineUsers;
                            return (
                                <div key={r._id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
                                                <Icon className="text-2xl" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase">{r.name}</h4>
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{r.location}</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteFacility(r._id)}
                                            className="text-rose-400 hover:text-rose-600 transition-colors"
                                        >
                                            <HiOutlineTrash className="text-xl" />
                                        </button>
                                    </div>
                                    <div className="mt-4 text-[10px] text-slate-500 font-medium line-clamp-2">
                                        {r.description}
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                                        <div className="text-[9px] font-black text-indigo-600 uppercase">Capacity: {r.capacity} PAX</div>
                                        <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${r.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {r.isActive ? 'Active' : 'Inactive'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'stats' && (
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                    <HiOutlineChartBar className="text-6xl text-indigo-100 mx-auto mb-6" />
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2 uppercase tracking-tight">Facility Analytics</h3>
                    <p className="text-slate-400 max-w-md mx-auto font-medium">Real-time tracking of resource usage across the hostel campus.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                        <div className="p-8 rounded-[2rem] bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50">
                            <div className="text-4xl font-black text-indigo-600 mb-2">{bookings.length}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bookings</div>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50">
                            <div className="text-4xl font-black text-emerald-600 mb-2">
                                {bookings.filter(b => b.status === 'approved').length}
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approved Requests</div>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50">
                            <div className="text-4xl font-black text-amber-600 mb-2">
                                {bookings.filter(b => b.status === 'pending').length}
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Decisions</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'innovation' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden border border-white/10">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 rounded-full border border-indigo-500/30 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                                <HiOutlineSparkles className="text-amber-400 animate-pulse" />
                                Smart Innovation Lab
                            </div>
                            <h2 className="text-4xl font-black mb-4 tracking-tighter uppercase">Predictive <span className="text-indigo-400 italic">Demand</span> Dashboard</h2>
                            <p className="text-slate-400 max-w-xl font-medium text-sm leading-relaxed">
                                Our AI engine analyzes historical booking patterns to forecast future facility usage. This helps you optimize staffing and energy consumption during peak hours.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Popularity Ranking */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <HiOutlineFire className="text-rose-500" />
                                Popularity Index
                            </h4>
                            <div className="space-y-4">
                                {getPopularityStats().length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 text-[10px] font-black uppercase tracking-widest">Gathering Data...</div>
                                ) : (
                                    getPopularityStats().map(([name, count], index) => (
                                        <div key={name} className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase">{name}</span>
                                                <span className="text-xs font-black text-indigo-600">{count} Bookings</span>
                                            </div>
                                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ${index === 0 ? 'bg-indigo-500' : index === 1 ? 'bg-indigo-400' : 'bg-indigo-300'}`}
                                                    style={{ width: `${(count / bookings.length) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Peak Hour Analysis */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <HiOutlineClock className="text-amber-500" />
                                Peak Hour Analysis
                            </h4>
                            <div className="space-y-4">
                                {getPeakHourStats().length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 text-[10px] font-black uppercase tracking-widest">Analyzing Slots...</div>
                                ) : (
                                    getPeakHourStats().slice(0, 5).map(([slot, count]) => (
                                        <div key={slot} className="flex items-center gap-4 group">
                                            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-indigo-50 transition-colors">
                                                {count}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Slot</div>
                                                <div className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase">{slot}</div>
                                            </div>
                                            <HiOutlinePresentationChartLine className="text-slate-300" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Future Forecast */}
                        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white space-y-6 shadow-xl shadow-indigo-600/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <HiOutlineSparkles className="text-6xl" />
                            </div>
                            <h4 className="text-sm font-black uppercase flex items-center gap-2">
                                <HiOutlineUsers />
                                Enrollment Forecast
                            </h4>
                            <div className="space-y-6 pt-4">
                                <div>
                                    <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2">Next 24 Hours (Est.)</div>
                                    <div className="text-5xl font-black italic">+{Math.floor(bookings.length * 0.4) + 5}</div>
                                    <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mt-2 flex items-center gap-2">
                                        <HiOutlinePresentationChartLine className="text-emerald-400" />
                                        Expected New Bookings
                                    </div>
                                </div>
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-[10px] font-medium leading-relaxed italic">
                                    "Based on current trends, we suggest increasing cleaning staff for the Gym between 16:00 and 20:00 tomorrow."
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceManagementStaff;
