import React, { useState, useEffect } from 'react';
import {
    HiOutlineHome,
    HiOutlineMapPin,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineExclamationCircle,
    HiOutlineKey,
    HiOutlineUserCircle,
    HiOutlineArrowRight,
    HiOutlineAdjustmentsHorizontal,
    HiOutlineWifi,
    HiOutlineBolt,
    HiOutlineSparkles,
    HiOutlineUserGroup,
    HiOutlineShieldCheck,
    HiOutlineChatBubbleLeftRight,
    HiOutlineExclamationTriangle,
    HiOutlineClock,
    HiOutlineQrCode,
    HiOutlineBanknotes,
    HiOutlineCreditCard,
    HiOutlineXMark,
    HiOutlinePaperAirplane
} from 'react-icons/hi2';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = '/api/room-booking';

const RoomBookingStudent = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFloor, setSelectedFloor] = useState('all');
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [bookingStep, setBookingStep] = useState('selection'); // 'selection' | 'confirmation' | 'payment'
    const [bookingData, setBookingData] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [myBooking, setMyBooking] = useState(null);
    const [statusLoading, setStatusLoading] = useState(true);

    // Advanced Filters State
    const [filters, setFilters] = useState({
        type: 'all',
        priceRange: [0, 50000],
        facilities: {
            wifi: false,
            ac: false,
            attachedWash: false
        },
        onlyAvailable: true
    });

    useEffect(() => {
        fetchRooms();
        fetchMyStatus();
    }, []);

    const fetchMyStatus = async () => {
        if (!user || !user.token) return;
        setStatusLoading(true);
        try {
            const res = await fetch('/api/allocations/me', {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMyBooking(data.data);
            }
        } catch (err) {
            console.error('Status fetch error:', err);
        } finally {
            setStatusLoading(false);
        }
    };

    const fetchRooms = async () => {
        if (!user || !user.token) return;
        setLoading(true);
        try {
            const wing = user?.wing || 'male';
            const res = await fetch(`${API_URL}/available?wing=${wing}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                setRooms(data.data);
                // Fetch suggestions if we have user info
                if (user?.degree || user?.wing) {
                    const suggRes = await fetch(`/api/allocations/suggest?wing=${user.wing || 'male'}&degree=${user.degree || ''}`, {
                        headers: { 'Authorization': `Bearer ${user.token}` }
                    });
                    const suggData = await suggRes.json();
                    if (suggData.success) setSuggestions(suggData.data);
                }
            }
        } catch (err) {
            toast.error('Failed to load available rooms');
        } finally {
            setLoading(false);
        }
    };

    const handleBook = (roomId, bedId) => {
        setBookingData({ roomId, bedId, room: selectedRoom });
        setShowDetailsModal(false); // Close details when starting booking flow
        setBookingStep('confirmation');
    };

    const confirmBooking = () => {
        setBookingStep('payment');
    };

    const processFinalBooking = async () => {
        setBookingLoading(true);
        try {
            const { roomId, bedId } = bookingData;
            const res = await fetch(`${API_URL}/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ roomId, bedId })
            });

            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                navigate('/student');
            } else {
                toast.error(data.message || 'Booking failed');
                setBookingStep('selection');
            }
        } catch (err) {
            toast.error('Connection error. Please try again.');
            setBookingStep('selection');
        } finally {
            setBookingLoading(false);
        }
    };

    const [isAiOpen, setIsAiOpen] = useState(false);
    const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', text: "Hello! I'm DormDesk AI. I can help you find the perfect room, check your roommate details, or track your payment status. How can I help you today?" }
    ]);
    const [aiInput, setAiInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);

    const getRoomPrice = (type) => {
        const prices = { 
            'single': 45000, 
            'double': 32000, 
            '2-bed': 32000, 
            'triple': 25000, 
            '3-bed': 25000, 
            '4-bed': 18000 
        };
        return prices[type?.toLowerCase()] || 20000;
    };

    const handleAiMessage = (e) => {
        if (e) e.preventDefault();
        if (!aiInput.trim()) return;

        const userText = aiInput.trim();
        setAiMessages(prev => [...prev, { role: 'user', text: userText }]);
        setAiInput('');
        setIsAiTyping(true);

        // System-Aware AI Logic
        setTimeout(() => {
            let response = "";
            const lowerText = userText.toLowerCase();

            if (lowerText.includes('available') || lowerText.includes('show rooms')) {
                const availableCount = rooms.filter(r => r.beds.some(b => !b.isOccupied)).length;
                response = `We currently have ${availableCount} rooms available in the ${user.wing || 'male'} wing. You can filter them by floor using the tabs at the top.`;
            } else if (lowerText.includes('double') || lowerText.includes('2-bed')) {
                const doubles = rooms.filter(r => r.type === '2-Bed' && r.beds.some(b => !b.isOccupied));
                response = doubles.length > 0 
                    ? `I found ${doubles.length} double rooms (2-Bed) available. They are priced at LKR 32,000 per month.`
                    : `I'm sorry, all 2-Bed rooms are currently occupied. Would you like to see 3-Bed or Single options?`;
            } else if (lowerText.includes('cheap') || lowerText.includes('price') || lowerText.includes('cost')) {
                const minPrice = Math.min(...['Single', '2-Bed', '3-Bed', '4-Bed'].map(t => getRoomPrice(t)));
                response = `The most affordable option is the 4-Bed sharing room at LKR 18,000 per month. The 3-Bed rooms are also great value at LKR 25,000.`;
            } else if (lowerText.includes('roommate')) {
                if (myBooking) {
                    const roommates = myBooking.room.beds.filter(b => b.isOccupied && b.bedId !== myBooking.bedId);
                    response = roommates.length > 0 
                        ? `You are in Room ${myBooking.room.roomnumber}. Your roommates are ${roommates.map(r => 'Student ' + r.bedId).join(' and ')}.`
                        : `You are in Room ${myBooking.room.roomnumber}. Currently, you don't have any roommates assigned to the other beds.`;
                } else {
                    response = `You haven't booked a room yet, so I can't check your roommates. Browse the rooms above to get started!`;
                }
            } else if (lowerText.includes('payment') || lowerText.includes('status')) {
                if (myBooking) {
                    response = `Your current booking for Room ${myBooking.room.roomnumber} is ${myBooking.status}. Your payment status is ${myBooking.paymentStatus.toUpperCase()}.`;
                } else {
                    response = `I don't see an active booking for you. Once you select a room and pay the deposit, your status will appear here.`;
                }
            } else if (lowerText.includes('book room')) {
                const roomNum = lowerText.match(/\d+/)?.[0];
                if (roomNum) {
                    const targetRoom = rooms.find(r => r.roomnumber.toString() === roomNum);
                    if (targetRoom) {
                        setSelectedRoom(targetRoom);
                        setShowDetailsModal(true);
                        response = `Certainly! I've opened the details for Room ${roomNum} for you. You can see the facilities and bed availability there.`;
                    } else {
                        response = `I couldn't find Room ${roomNum} in our available listings. Please check the room number and try again.`;
                    }
                } else {
                    response = `Which room would you like to book? You can say "Book room 102" or simply click on any room card.`;
                }
            } else {
                response = "I'm not quite sure about that. I can help with room availability, prices, roommate info, or your booking status. Try asking 'What double rooms are available?'";
            }

            setAiMessages(prev => [...prev, { role: 'assistant', text: response }]);
            setIsAiTyping(false);
        }, 1000);
    };

    const handleChat = (name) => {
        toast.success(`Opening chat with ${name}...`, {
            icon: '💬',
            style: { borderRadius: '1rem', background: '#4F46E5', color: '#fff' }
        });
    };

    const handleReport = (roomNumber) => {
        toast.error(`Redirecting to support for Room ${roomNumber}...`, {
            icon: '⚠️',
            style: { borderRadius: '1rem' }
        });
    };



    const floors = ['all', ...new Set(rooms.map(r => r.floorNumber))].sort();

    const filteredRooms = rooms.filter(room => {
        if (selectedFloor !== 'all' && room.floorNumber !== selectedFloor) return false;
        if (filters.type !== 'all' && room.type?.toLowerCase() !== filters.type) return false;
        if (filters.onlyAvailable) {
            const hasAvailableBed = room.beds.some(b => !b.isOccupied);
            if (!hasAvailableBed) return false;
        }
        if (filters.facilities.ac && room.type?.toLowerCase() === 'triple') return false;
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Booking Status Banner */}
            {!statusLoading && myBooking && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                            <HiOutlineHome size={28} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Booking</div>
                            <h4 className="text-xl font-black text-slate-800 dark:text-white">Room {myBooking.roomnumber} • Bed {myBooking.bedId}</h4>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex flex-col items-end">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Payment Status</div>
                            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm ${
                                myBooking.paymentStatus === 'Paid' 
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                : 'bg-amber-50 border-amber-100 text-amber-600'
                            }`}>
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${myBooking.paymentStatus === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{myBooking.paymentStatus || 'Pending'}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Allocation Status</div>
                            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm ${
                                myBooking.status === 'Confirmed' 
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                                : 'bg-slate-50 border-slate-100 text-slate-600'
                            }`}>
                                {myBooking.status === 'Confirmed' ? <HiOutlineCheckCircle size={14} /> : <HiOutlineClock size={14} />}
                                <span className="text-[10px] font-black uppercase tracking-widest">{myBooking.status || 'Processing'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Smart Header */}
            <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900 rounded-[2.5rem] p-8 md:p-14 text-white shadow-xl relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full -mr-64 -mt-64 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full -ml-48 -mb-48 blur-3xl"></div>

                <div className="relative z-10 space-y-10">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
                        <div className="space-y-6 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                                Live Room Availability
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
                                Book Your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400">Perfect Room</span>
                            </h1>
                            <p className="text-indigo-100/80 text-lg font-medium leading-relaxed">
                                Find your ideal sanctuary. Filter by floor, explore amenities, and secure your spot in seconds.
                            </p>

                            {/* Recommendations Row */}
                            <div className="flex flex-wrap gap-4 pt-4">
                                {rooms.length > 0 && (
                                    <>
                                        <div className="flex items-center gap-3 px-5 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl hover:bg-white/20 transition-all cursor-default group">
                                            <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-400 text-lg">⭐</div>
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-indigo-200/60">Recommended</div>
                                                <div className="text-sm font-black text-white">Room {rooms.find(r => r.type?.toLowerCase() === 'double')?.roomnumber || rooms[0]?.roomnumber} <span className="text-[10px] text-white/50 font-bold ml-1">(Best Value)</span></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 px-5 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl hover:bg-white/20 transition-all cursor-default group">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-400/20 flex items-center justify-center text-emerald-400 text-lg">💰</div>
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-indigo-200/60">Cheapest</div>
                                                <div className="text-sm font-black text-white">Room {rooms.find(r => r.type?.toLowerCase() === 'triple')?.roomnumber || rooms[rooms.length - 1]?.roomnumber} <span className="text-[10px] text-white/50 font-bold ml-1">(Eco Choice)</span></div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/20 shadow-2xl min-w-[240px] text-center group hover:bg-white/20 transition-all">
                                <div className="text-6xl font-black text-white group-hover:scale-110 transition-transform duration-500">{rooms.length}</div>
                                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-200 mt-2">Available Rooms</div>
                                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black">{rooms.filter(r => r.type?.toLowerCase() === 'single').length}</span>
                                        <span className="text-[8px] font-bold text-indigo-300 uppercase tracking-widest">Single</span>
                                    </div>
                                    <div className="w-px h-6 bg-white/10"></div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black">{rooms.filter(r => r.type?.toLowerCase() === 'double').length}</span>
                                        <span className="text-[8px] font-bold text-indigo-300 uppercase tracking-widest">Double</span>
                                    </div>
                                    <div className="w-px h-6 bg-white/10"></div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black">{rooms.filter(r => r.type?.toLowerCase() === 'triple').length}</span>
                                        <span className="text-[8px] font-bold text-indigo-300 uppercase tracking-widest">Triple</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floor Filters */}
                    <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 mr-2">Filter by Floor:</span>
                        <div className="flex flex-wrap gap-3">
                            {floors.map(floor => (
                                <button
                                    key={floor}
                                    onClick={() => { setSelectedFloor(floor); setSelectedRoom(null); }}
                                    className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${selectedFloor === floor
                                            ? 'bg-white text-indigo-700 shadow-[0_15px_30px_-10px_rgba(255,255,255,0.3)] scale-105'
                                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                        }`}
                                >
                                    <HiOutlineMapPin className={selectedFloor === floor ? 'text-indigo-500' : 'text-indigo-200'} />
                                    {floor === 'all' ? 'Everywhere' : `Floor ${floor}`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Advanced Filters Panel */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 sticky top-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <HiOutlineHome className="text-xl text-indigo-600" />
                                </div>
                                <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Filters</h3>
                            </div>
                            <button
                                onClick={() => setFilters({
                                    type: 'all',
                                    priceRange: [0, 50000],
                                    facilities: { wifi: false, ac: false, attachedWash: false },
                                    onlyAvailable: true
                                })}
                                className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors"
                            >
                                Reset
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* Room Type */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Room Type</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {['all', 'single', 'double', 'triple'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setFilters({ ...filters, type: t })}
                                            className={`px-4 py-3 rounded-xl text-xs font-bold capitalize transition-all border-2 text-left flex items-center justify-between ${filters.type === t
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                                                    : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 text-slate-500 hover:border-slate-200'
                                                }`}
                                        >
                                            {t === 'all' ? 'Any Type' : `${t} Sharing`}
                                            {filters.type === t && <HiOutlineCheckCircle className="text-lg" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Availability Toggle */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Availability</label>
                                <button
                                    onClick={() => setFilters({ ...filters, onlyAvailable: !filters.onlyAvailable })}
                                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${filters.onlyAvailable
                                            ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500 text-emerald-700'
                                            : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 text-slate-400'
                                        }`}
                                >
                                    <span className="text-xs font-bold">Only Show Available</span>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${filters.onlyAvailable ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${filters.onlyAvailable ? 'right-1' : 'left-1'}`} />
                                    </div>
                                </button>
                            </div>

                            {/* Price Range */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Range</label>
                                    <span className="text-[10px] font-black text-indigo-600">LKR 5k - 25k</span>
                                </div>
                                <div className="px-2">
                                    <input type="range" className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                </div>
                            </div>

                            {/* Facilities */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Facilities</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'wifi', label: 'High-speed WiFi' },
                                        { id: 'ac', label: 'Air Conditioning' },
                                        { id: 'attachedWash', label: 'Attached Bathroom' }
                                    ].map(fac => (
                                        <button
                                            key={fac.id}
                                            onClick={() => setFilters({
                                                ...filters,
                                                facilities: { ...filters.facilities, [fac.id]: !filters.facilities[fac.id] }
                                            })}
                                            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border-2 text-left flex items-center gap-3 ${filters.facilities[fac.id]
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                                                    : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 text-slate-500'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filters.facilities[fac.id] ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                                                {filters.facilities[fac.id] && <HiOutlineCheckCircle size={12} />}
                                            </div>
                                            {fac.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Room Grid Area */}
                <div className="lg:col-span-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredRooms.map(room => (
                            <button
                                key={room._id}
                                onClick={() => {
                                    setSelectedRoom(room);
                                    setShowDetailsModal(true);
                                }}
                                className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 text-left space-y-2 relative group overflow-hidden ${selectedRoom?._id === room._id
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl scale-105'
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.15)]'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedRoom?._id === room._id ? 'bg-white/20' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
                                    <HiOutlineHome className={`text-xl ${selectedRoom?._id === room._id ? 'text-white' : 'text-indigo-600'}`} />
                                </div>
                                <div className="text-lg font-black tracking-tight flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <span className={selectedRoom?._id === room._id ? 'text-white' : 'text-slate-800'}>Room {room.roomnumber}</span>
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl backdrop-blur-md border shadow-sm transition-all ${
                                            selectedRoom?._id === room._id 
                                            ? 'bg-white/20 border-white/30 text-white' 
                                            : (room.roomnumber % 25 + 75) >= 90
                                                ? 'bg-emerald-100 border-emerald-100 text-emerald-600'
                                                : (room.roomnumber % 25 + 75) >= 80
                                                    ? 'bg-amber-50 border-amber-100 text-amber-600'
                                                    : 'bg-rose-50 border-rose-100 text-rose-600'
                                        }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                                (room.roomnumber % 25 + 75) >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                                            }`} />
                                            <span className="text-[10px] font-black tracking-tighter">
                                                {Math.floor((room.roomnumber % 25) + 75)}% Match
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${selectedRoom?._id === room._id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                        <HiOutlineUserCircle className="text-sm" />
                                        <span className="opacity-60">Best Match:</span>
                                        <span className={selectedRoom?._id === room._id ? 'text-white' : 'text-indigo-600'}>
                                            {['John', 'David', 'Sarah', 'Emma', 'Michael', 'Alex', 'James', 'Lisa'][room.roomnumber % 8]}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ${selectedRoom?._id === room._id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    {room.type} • Floor {room.floorNumber}
                                </div>
                                
                                <div className="py-4">
                                    <div className={`text-2xl font-black tracking-tighter ${selectedRoom?._id === room._id ? 'text-amber-300' : 'text-indigo-600'}`}>
                                        <span className="text-sm font-medium mr-0.5 opacity-60">LKR</span> 
                                        {getRoomPrice(room.type).toLocaleString()}
                                        <span className="text-[10px] font-medium ml-1 opacity-50 uppercase tracking-widest">/mo</span>
                                    </div>
                                </div>

                                <div className={`flex items-center justify-between py-3 border-t border-b ${selectedRoom?._id === room._id ? 'border-white/10' : 'border-slate-100 dark:border-white/5'}`}>
                                    <div className="flex items-center gap-2">
                                        <div className="flex -space-x-1">
                                            {room.beds.map(bed => (
                                                <div 
                                                    key={bed.bedId} 
                                                    className={`w-3 h-3 rounded-full border-2 ${
                                                        selectedRoom?._id === room._id ? 'border-indigo-600' : 'border-white dark:border-slate-900'
                                                    } ${bed.isOccupied ? 'bg-rose-400' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'}`}
                                                />
                                            ))}
                                        </div>
                                        <span className={`text-[11px] font-black ${selectedRoom?._id === room._id ? 'text-white' : 'text-slate-600'}`}>
                                            {room.beds.filter(b => !b.isOccupied).length}/{room.beds.length} Available
                                        </span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <div title="High-speed WiFi" className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${selectedRoom?._id === room._id ? 'bg-white/10 text-white' : 'bg-slate-50 dark:bg-slate-800 text-indigo-500'}`}>
                                            <HiOutlineWifi size={14} />
                                        </div>
                                        <div title="AC & Climate Control" className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${selectedRoom?._id === room._id ? 'bg-white/10 text-white' : 'bg-slate-50 dark:bg-slate-800 text-amber-500'}`}>
                                            <HiOutlineBolt size={14} />
                                        </div>
                                    </div>
                                </div>

                                <div className={`absolute inset-0 bg-indigo-600/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 transition-all duration-300 ${selectedRoom?._id === room._id ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75">
                                        <HiOutlineArrowRight className="text-xl text-indigo-600 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <span className="text-white font-black text-xs uppercase tracking-widest transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                                        View Beds
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                    {filteredRooms.length === 0 && (
                        <div className="col-span-full py-32 text-center space-y-6 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto">
                                <HiOutlineExclamationCircle className="text-4xl text-slate-300" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-slate-900 dark:text-white font-black uppercase tracking-tight">No Matches Found</p>
                                <p className="text-slate-400 text-sm font-medium">Try adjusting your filters to find more rooms.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Selection Sidebar (Right) */}
                <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 sticky top-8 overflow-hidden animate-in slide-in-from-right duration-500">
                        {selectedRoom ? (
                            <div className="flex flex-col h-full max-h-[85vh]">
                                {/* Header */}
                                <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                    <div className="relative z-10 flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                            <HiOutlineHome className="text-3xl" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black leading-none">Room {selectedRoom.roomnumber}</h3>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 mt-1.5">Floor {selectedRoom.floorNumber} • {selectedRoom.type}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Content - Scrollable */}
                                <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                    {/* Occupants Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <HiOutlineUserGroup className="text-lg" />
                                            <h4 className="text-[11px] font-black uppercase tracking-widest">Roommates Details</h4>
                                        </div>
                                        <div className="space-y-3">
                                            {selectedRoom.beds.filter(b => b.isOccupied).length > 0 ? (
                                                selectedRoom.beds.filter(b => b.isOccupied).map((bed, idx) => {
                                                    const student = [
                                                        { name: 'John Doe', degree: 'Computer Science', match: 94 },
                                                        { name: 'Alice Smith', degree: 'Business Admin', match: 88 },
                                                        { name: 'Robert King', degree: 'Engineering', match: 91 },
                                                        { name: 'Mary Lane', degree: 'Medicine', match: 85 }
                                                    ][idx % 4];
                                                    return (
                                                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:border-indigo-200 group">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-xs">
                                                                {student.name.split(' ').map(n => n[0]).join('')}
                                                            </div>
                                                            <div className="flex-grow">
                                                                <div className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">{student.name}</div>
                                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{student.degree}</div>
                                                                <div className="mt-1">
                                                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-md">{student.match}% Match</span>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleChat(student.name)}
                                                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            >
                                                                <HiOutlineChatBubbleLeftRight size={16} />
                                                            </button>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-800">
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Fresh Room • Join Now!</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Select Bed Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <HiOutlineKey className="text-lg" />
                                            <h4 className="text-[11px] font-black uppercase tracking-widest">Select Available Bed</h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {selectedRoom.beds.map(bed => (
                                                <button
                                                    key={bed.bedId}
                                                    disabled={bed.isOccupied}
                                                    onClick={() => handleBook(selectedRoom._id, bed.bedId)}
                                                    className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all group ${bed.isOccupied
                                                        ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-50 cursor-not-allowed'
                                                        : 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-500 hover:shadow-lg'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${bed.isOccupied ? 'bg-slate-100' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                                                            <HiOutlineKey className="text-lg" />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="font-black text-sm text-slate-800 dark:text-slate-200">Bed {bed.bedId}</div>
                                                            <div className={`text-[9px] font-black uppercase tracking-widest ${bed.isOccupied ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                {bed.isOccupied ? 'Occupied' : 'Book Now'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {!bed.isOccupied && <HiOutlineArrowRight className="text-emerald-500 group-hover:translate-x-1 transition-transform" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Facilities Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <HiOutlineSparkles className="text-lg" />
                                            <h4 className="text-[11px] font-black uppercase tracking-widest">Amenities</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { icon: HiOutlineWifi, label: 'Fast WiFi', color: 'text-indigo-500' },
                                                { icon: HiOutlineBolt, label: 'AC Control', color: 'text-amber-500' },
                                                { icon: HiOutlineShieldCheck, label: 'Secured', color: 'text-emerald-500' },
                                                { icon: HiOutlineClock, label: '24/7 Access', color: 'text-rose-500' }
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <item.icon className={`text-sm ${item.color}`} />
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Rules Section */}
                                    <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <HiOutlineShieldCheck className="text-lg" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest">Room Policies</h4>
                                        </div>
                                        <ul className="space-y-2">
                                            <li className="flex items-start gap-2 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1"></span>
                                                Silent hours: 10 PM - 6 AM
                                            </li>
                                            <li className="flex items-start gap-2 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1"></span>
                                                Weekly cleanliness audit
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <button className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                                            <HiOutlineChatBubbleLeftRight className="text-lg" />
                                            Support
                                        </button>
                                        <button className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all">
                                            <HiOutlineExclamationTriangle className="text-lg" />
                                            Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-32 px-8 text-center space-y-6">
                                <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                                    <HiOutlineHome className="text-5xl text-indigo-300" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Select a Room</h3>
                                    <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                        Choose a room from the gallery to explore detailed floor plans, occupant profiles, and book your stay.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Modals for Flow */}
                {bookingStep === 'confirmation' && bookingData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border border-white/20 space-y-8 animate-in zoom-in duration-300">
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto text-indigo-600">
                                    <HiOutlineHome size={40} />
                                </div>
                                <h3 className="text-3xl font-black tracking-tight">Confirm Booking</h3>
                                <p className="text-slate-500 font-medium">You are about to book Room {bookingData.room.roomnumber}, Bed {bookingData.bedId}.</p>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-4">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Future Roommates</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {bookingData.room.beds.filter(b => b.isOccupied).map((bed, i) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <div className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-[8px] font-black flex items-center justify-center text-indigo-600">
                                                    {['JD', 'AS', 'RK', 'ML'][i % 4]}
                                                </div>
                                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{['John Doe', 'Alice Smith', 'Robert King', 'Mary Lane'][i % 4]}</span>
                                            </div>
                                        ))}
                                        {bookingData.room.beds.filter(b => b.isOccupied).length === 0 && (
                                            <div className="text-[10px] font-bold text-slate-400 italic py-1 px-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 w-full text-center">
                                                Fresh Room • Be the first to join!
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monthly Rent</span>
                                        <span className="font-black text-indigo-600">LKR {getRoomPrice(bookingData.room.type).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Security Deposit</span>
                                        <span className="font-black text-slate-800 dark:text-white text-sm">LKR 20,000</span>
                                    </div>
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <span className="text-sm font-black uppercase tracking-tight">Total Payable</span>
                                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">LKR {(getRoomPrice(bookingData.room.type) + 20000).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setBookingStep('selection')} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                                <button onClick={confirmBooking} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all">Proceed to Pay</button>
                            </div>
                        </div>
                    </div>
                )}

                {bookingStep === 'payment' && bookingData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] overflow-hidden max-w-2xl w-full shadow-2xl border border-white/20 flex flex-col md:flex-row animate-in slide-in-from-bottom-8 duration-500">
                            {/* Left: QR Section */}
                            <div className="bg-indigo-600 p-12 text-white flex flex-col items-center justify-center text-center space-y-8 md:w-1/2 relative">
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500 to-purple-800 opacity-50"></div>
                                <div className="relative z-10 space-y-6">
                                    <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl inline-block border-8 border-indigo-400/20">
                                        <QRCodeSVG value={`DormDesk:RoomBook:${bookingData.roomId}:${user._id}`} size={180} />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-black tracking-tight">Scan to Pay</h4>
                                        <p className="text-indigo-100/60 text-[10px] font-bold uppercase tracking-[0.2em]">LKR {(getRoomPrice(bookingData.room.type) + 20000).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Info Section */}
                            <div className="p-10 space-y-8 flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <HiOutlineBanknotes size={24} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Bank Transfer</span>
                                    </div>
                                    <HiOutlineCreditCard size={24} className="text-slate-300" />
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Name</div>
                                            <div className="text-sm font-black text-slate-800 dark:text-white uppercase">DormDesk Hostel Management</div>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Number</div>
                                            <div className="text-sm font-black text-slate-800 dark:text-white flex items-center justify-between">
                                                0012 8844 9922 1010
                                                <button className="text-[10px] text-indigo-500 font-black uppercase hover:underline">Copy</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                                        <HiOutlineClock className="text-amber-600 shrink-0" size={18} />
                                        <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 leading-relaxed">
                                            Please upload your payment slip in the dashboard after completing the transfer. Your booking will be activated after verification.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4">
                                    <button 
                                        disabled={bookingLoading}
                                        onClick={processFinalBooking}
                                        className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {bookingLoading ? 'Processing...' : 'I Have Paid'}
                                    </button>
                                    <button onClick={() => setBookingStep('selection')} className="w-full text-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancel Payment</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Room Details Full Modal */}
                {showDetailsModal && selectedRoom && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/20 flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
                            
                            {/* Left: Visual & Summary */}
                            <div className="md:w-2/5 bg-indigo-600 p-12 text-white relative flex flex-col justify-between overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full -ml-24 -mb-24 blur-3xl"></div>
                                
                                <div className="relative z-10 space-y-6">
                                    <button 
                                        onClick={() => setShowDetailsModal(false)}
                                        className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all mb-8"
                                    >
                                        <HiOutlineXCircle className="text-2xl" />
                                    </button>
                                    
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                            Floor {selectedRoom.floorNumber} • {selectedRoom.type}
                                        </div>
                                        <h2 className="text-6xl font-black tracking-tighter leading-none mb-4">Room {selectedRoom.roomnumber}</h2>
                                        <p className="text-indigo-100/60 font-medium leading-relaxed">
                                            Premium student accommodation designed for comfort and focused study sessions.
                                        </p>
                                    </div>

                                    <div className="py-8 border-y border-white/10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-indigo-200">Price per Month</span>
                                            <span className="text-2xl font-black text-amber-300">LKR {getRoomPrice(selectedRoom.type).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 flex gap-4">
                                    <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                        <div className="text-2xl font-black">{selectedRoom.beds.filter(b => !b.isOccupied).length}</div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Available Beds</div>
                                    </div>
                                    <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                        <div className="text-2xl font-black">{Math.floor((selectedRoom.roomnumber % 25) + 75)}%</div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Match Score</div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Detailed Tabs/Sections */}
                            <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-10 overflow-y-auto custom-scrollbar space-y-10">
                                {/* Occupants Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-indigo-600">
                                            <HiOutlineUserGroup size={22} />
                                            <h4 className="text-xs font-black uppercase tracking-widest">Current Occupants</h4>
                                        </div>
                                        <button 
                                            onClick={() => handleChat('Roommates')}
                                            className="text-[10px] font-black text-indigo-500 hover:underline flex items-center gap-1"
                                        >
                                            <HiOutlineChatBubbleLeftRight size={14} />
                                            Group Chat
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedRoom.beds.filter(b => b.isOccupied).map((bed, i) => {
                                            const studentData = [
                                                { name: 'John Doe', degree: 'Computer Science', match: 94 },
                                                { name: 'Alice Smith', degree: 'Business Admin', match: 88 },
                                                { name: 'Robert King', degree: 'Engineering', match: 91 },
                                                { name: 'Mary Lane', degree: 'Medicine', match: 85 }
                                            ][i % 4];
                                            return (
                                                <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm hover:border-indigo-300 transition-all group">
                                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-black text-indigo-600 relative">
                                                        {studentData.name.split(' ').map(n => n[0]).join('')}
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-xs font-black group-hover:text-indigo-600 transition-colors">{studentData.name}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase">{studentData.degree}</div>
                                                        <div className="mt-1 flex items-center gap-1.5">
                                                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-md">{studentData.match}% Match</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleChat(studentData.name)}
                                                        className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                                                    >
                                                        <HiOutlineChatBubbleLeftRight size={18} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {selectedRoom.beds.filter(b => !b.isOccupied).map((bed, i) => (
                                            <div key={i} className="bg-slate-100/50 dark:bg-slate-900/30 p-4 rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400">
                                                    ?
                                                </div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vacant Bed</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Facilities & Rules */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-600">
                                            <HiOutlineSparkles size={22} />
                                            <h4 className="text-xs font-black uppercase tracking-widest">Amenities</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { icon: HiOutlineWifi, label: 'High Speed WiFi' },
                                                { icon: HiOutlineBolt, label: 'Climate Control' },
                                                { icon: HiOutlineShieldCheck, label: '24/7 Security' },
                                                { icon: HiOutlineClock, label: 'No Curfew' }
                                            ].map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <f.icon className="text-indigo-500" size={14} />
                                                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase">{f.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-600">
                                            <HiOutlineShieldCheck size={22} />
                                            <h4 className="text-xs font-black uppercase tracking-widest">Policies</h4>
                                        </div>
                                        <ul className="space-y-2">
                                            <li className="flex items-start gap-2 text-[10px] font-medium text-slate-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1" />
                                                Strict silence after 10:00 PM
                                            </li>
                                            <li className="flex items-start gap-2 text-[10px] font-medium text-slate-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1" />
                                                No outside visitors in rooms
                                            </li>
                                        </ul>
                                    </section>
                                </div>

                                {/* Booking Actions */}
                                <section className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Ready to join this room?</h4>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button 
                                            onClick={() => handleReport(selectedRoom.roomnumber)}
                                            className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-300 transition-all flex items-center justify-center gap-2"
                                        >
                                            <HiOutlineExclamationTriangle size={18} />
                                            Report Issue
                                        </button>
                                        <div className="flex-[2] flex gap-2">
                                            {selectedRoom.beds.filter(b => !b.isOccupied).slice(0, 1).map(bed => (
                                                <button 
                                                    key={bed.bedId}
                                                    onClick={() => handleBook(selectedRoom._id, bed.bedId)}
                                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
                                                >
                                                    Confirm & Book Now
                                                    <HiOutlineArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* AI Chat Bot UI */}
            <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4 pointer-events-none">
                {isAiOpen && (
                    <div className="pointer-events-auto w-[380px] h-[550px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-white/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
                        {/* Chat Header */}
                        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
                                    <HiOutlineSparkles size={22} className="animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">DormDesk AI</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                        <span className="text-[9px] font-black text-indigo-100 uppercase tracking-widest">System Aware Assistant</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsAiOpen(false)}
                                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                            >
                                <HiOutlineXMark size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar no-scrollbar">
                            {aiMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] font-medium leading-relaxed ${
                                        msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isAiTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Chips */}
                        <div className="px-6 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
                            {['Show available', 'Who is my roommate?', 'Payment status', 'Cheapest room'].map((chip, i) => (
                                <button 
                                    key={i}
                                    onClick={() => { setAiInput(chip); handleAiMessage(); }}
                                    className="whitespace-nowrap px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700 transition-all"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleAiMessage} className="p-6 pt-2">
                            <div className="relative group">
                                <input 
                                    type="text"
                                    value={aiInput}
                                    onChange={(e) => setAiInput(e.target.value)}
                                    placeholder="Ask about rooms, payments..."
                                    className="w-full pl-4 pr-12 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                />
                                <button 
                                    type="submit"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <HiOutlinePaperAirplane size={18} />
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Floating Bubble */}
                <button 
                    onClick={() => setIsAiOpen(!isAiOpen)}
                    className="pointer-events-auto w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-[0_15px_35px_-10px_rgba(79,70,229,0.5)] hover:scale-110 active:scale-95 transition-all group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {isAiOpen ? <HiOutlineXMark size={28} /> : <HiOutlineSparkles size={28} className="animate-pulse" />}
                </button>
            </div>
        </div>
    );
}

export default RoomBookingStudent;
