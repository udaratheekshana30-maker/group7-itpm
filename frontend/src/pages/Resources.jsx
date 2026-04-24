import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import {
    HiOutlinePlus, HiOutlineTrash, HiXMark,
    HiOutlineBuildingOffice2, HiOutlineAcademicCap,
    HiOutlineCheckCircle, HiOutlineExclamationTriangle,
    HiOutlinePencilSquare, HiOutlineArrowPath,
    HiOutlineLockClosed, HiMagnifyingGlass,
    HiOutlineTableCells, HiOutlineDocumentArrowDown
} from 'react-icons/hi2';

// ── Status helpers ─────────────────────────────────────────────────────────────
// Room goods status cycle: AVAILABLE → OCCUPIED → MISSING
const STATUS_CYCLE       = ['AVAILABLE', 'OCCUPIED', 'MISSING'];
// Common area status cycle keeps MAINTENANCE instead of OCCUPIED
const CA_STATUS_CYCLE    = ['AVAILABLE', 'MISSING', 'MAINTENANCE'];
const nextStatus   = (s) => STATUS_CYCLE[   (STATUS_CYCLE.indexOf(s)    + 1) % STATUS_CYCLE.length];
const nextCAStatus = (s) => CA_STATUS_CYCLE[(CA_STATUS_CYCLE.indexOf(s) + 1) % CA_STATUS_CYCLE.length];

const StatusBadge = ({ status, onClick, disabled }) => {
    const cfg = {
        AVAILABLE:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        OCCUPIED:    'bg-indigo-100  text-indigo-700  dark:bg-indigo-900/30  dark:text-indigo-400',
        MISSING:     'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-400',
        MAINTENANCE: 'bg-rose-100    text-rose-700    dark:bg-rose-900/30    dark:text-rose-400',
    };
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border-none ${cfg[status] || cfg.AVAILABLE} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
        >
            {status === 'AVAILABLE'   && <HiOutlineCheckCircle       className="inline mr-1 text-sm" />}
            {status === 'OCCUPIED'    && <HiOutlineLockClosed         className="inline mr-1 text-sm" />}
            {status === 'MISSING'     && <HiOutlineExclamationTriangle className="inline mr-1 text-sm" />}
            {status === 'MAINTENANCE' && <HiOutlineExclamationTriangle className="inline mr-1 text-sm" />}
            {status}
        </button>
    );
};

// ── Common Areas Tab ─────────────────────────────────────────────────────────
function CommonAreasTab() {
    const [subTab, setSubTab] = useState('Ground Floor');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ itemName: '', itemType: '', uniqueCode: '', status: 'AVAILABLE' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getCommonAreaItems(subTab);
            setItems(data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [subTab]);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.addCommonAreaItem({ ...form, areaName: subTab });
            toast.success('Item added successfully');
            setShowModal(false);
            setForm({ itemName: '', itemType: '', uniqueCode: '', status: 'AVAILABLE' });
            load();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleStatusCycle = async (item) => {
        const newStatus = nextCAStatus(item.status);
        try {
            await api.updateCommonAreaItemStatus(item._id, newStatus);
            setItems(prev => prev.map(i => i._id === item._id ? { ...i, status: newStatus } : i));
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this item?')) return;
        try {
            await api.deleteCommonAreaItem(id);
            toast.success('Item deleted');
            setItems(prev => prev.filter(i => i._id !== id));
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Sub-tab + Add button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                    {['Ground Floor', 'Floor 1'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setSubTab(tab)}
                            className={`px-5 py-2 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${subTab === tab ? 'bg-[#FAB95B] text-[#1A3263] shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-500/20 border-none cursor-pointer"
                >
                    <HiOutlinePlus className="text-lg" /> Add Item
                </button>
            </div>

            {/* Table */}
            <div className="card !p-0 overflow-hidden dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <div className="table-container">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                {['Item Name', 'Type', 'Unique Code', 'Status', 'Actions'].map(h => (
                                    <th key={h} className={`px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${h === 'Actions' ? 'text-right' : h === 'Status' || h === 'Type' ? 'text-center' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-16 text-slate-400 italic">Loading...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-16 text-slate-400 italic">No items in {subTab}. Add some!</td></tr>
                            ) : items.map(item => (
                                <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{item.itemName}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-black uppercase">{item.itemType}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">{item.uniqueCode}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusBadge status={item.status} onClick={() => handleStatusCycle(item)} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(item._id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all border-none cursor-pointer"
                                        >
                                            <HiOutlineTrash className="text-lg" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Item Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal !max-w-md dark:bg-slate-900" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Add Item — {subTab}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"><HiXMark className="text-2xl" /></button>
                        </div>
                        <form onSubmit={handleAdd} className="modal-body p-8 space-y-5">
                            <div className="form-group">
                                <label className="form-label font-black">Item Name</label>
                                <input className="form-input" placeholder="e.g. Office Chair #3" required value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label font-black">Item Type</label>
                                <input className="form-input" placeholder="e.g. Chair, Table, Fan, Board..." required value={form.itemType} onChange={e => setForm({ ...form, itemType: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label font-black">Unique Code</label>
                                <input className="form-input font-mono" placeholder="e.g. CA-GF-001" required value={form.uniqueCode} onChange={e => setForm({ ...form, uniqueCode: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label font-black">Status</label>
                                <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    {CA_STATUS_CYCLE.map(s => (
                                        <button key={s} type="button" onClick={() => setForm({ ...form, status: s })}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all border-none cursor-pointer ${form.status === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button disabled={saving} className="btn btn-primary w-full !h-12 !rounded-xl !font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 mt-2">
                                {saving ? 'Adding...' : 'Add to Inventory'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Room Detail Modal (Student Floors) ───────────────────────────────────────
function RoomDetailModal({ room: initialRoom, floorActive, onClose }) {
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // goodId being saved
    const isMigratingRef = useRef(false);

    useEffect(() => {
        const loadGoods = async () => {
            if (isMigratingRef.current) return;
            try {
                let data = await api.getRoomGoods(initialRoom._id);
                // Auto-migrate/Self-heal if this room has no goods, duplicates, or outdated items like 'BED'
                const checkBedsNeedRepair = data.beds.some(b => {
                    const furniture = b.goods || [];
                    const types = furniture.map(f => f.itemType || f.type);
                    // Needs repair if not exactly 3 items OR contains 'BED' OR has duplicates
                    return types.length !== 3 || types.includes('BED') || new Set(types).size !== types.length;
                });

                if (checkBedsNeedRepair) {
                    isMigratingRef.current = true;
                    // Pass current room id to fix only this room
                    await api.migrateRoomGoods({ roomId: initialRoom._id });
                    data = await api.getRoomGoods(initialRoom._id);
                    isMigratingRef.current = false;
                }
                setRoom(data);
            } catch (err) {
                toast.error(err.message);
                isMigratingRef.current = false;
            } finally {
                setLoading(false);
            }
        };
        loadGoods();
    }, [initialRoom._id]);

    const handleBedGoodChange = async (bedId, goodId, field, value) => {
        if (!floorActive) return;
        setSaving(goodId);
        try {
            const updated = await api.updateBedGood(room._id, goodId, { bedId, [field]: value });
            setRoom(updated);
            toast.success('Saved');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(null);
        }
    };

    const handleRoomGoodChange = async (goodId, field, value) => {
        if (!floorActive) return;
        setSaving(goodId);
        try {
            const updated = await api.updateRoomLevelGood(room._id, goodId, { [field]: value });
            setRoom(updated);
            toast.success('Saved');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(null);
        }
    };

    const goodTypeLabel = {
        CHAIR: 'Chair',
        CUPBOARD: 'Cupboard',
        TABLE: 'Table',
        BED: 'Bed'
    };

    const GoodRow = ({ good, onChange, disabled }) => (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20 shrink-0 text-center truncate">
                {goodTypeLabel[good.type] || good.itemType || good.type || 'Item'}
            </span>
            <input
                className="form-input !py-2 !text-xs font-mono flex-1 min-w-0 text-center focus:!ring-indigo-500 focus:!border-indigo-500"
                placeholder="Enter code..."
                defaultValue={good.uniqueCode || ''}
                disabled={disabled || saving === good._id}
                onBlur={e => {
                    if (e.target.value !== (good.uniqueCode || '')) {
                        onChange(good._id, 'uniqueCode', e.target.value);
                    }
                }}
            />
            <div className="shrink-0">
                <StatusBadge
                    status={good.status}
                    disabled={disabled || saving === good._id}
                    onClick={() => onChange(good._id, 'status', nextStatus(good.status))}
                />
            </div>
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal !max-w-2xl dark:bg-slate-900 !max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="modal-header shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Room {initialRoom.Roomid}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                            {initialRoom.type} room · Floor {initialRoom.floorNumber}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"><HiXMark className="text-2xl" /></button>
                </div>

                {!floorActive && (
                    <div className="mx-8 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 shrink-0">
                        <HiOutlineExclamationTriangle className="text-amber-500 text-lg shrink-0" />
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">This floor is currently disabled. Goods are read-only.</p>
                    </div>
                )}

                <div className="overflow-y-auto flex-1 p-8 space-y-6">
                    {loading ? (
                        <div className="py-16 text-center text-slate-400 italic">Loading goods...</div>
                    ) : room ? (
                        <>
                            {/* Bed Sections */}
                            {room.beds.map(bed => (
                                <div key={bed.bedId} className="card dark:bg-slate-800/50 !p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Bed {bed.bedId}</h4>
                                        {bed.isOccupied && bed.allocation ? (
                                            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl">
                                                <HiOutlineAcademicCap className="text-indigo-500 text-base" />
                                                <div>
                                                    <p className="text-xs font-black text-indigo-700 dark:text-indigo-300">{bed.allocation.studentName}</p>
                                                    <p className="text-[10px] text-indigo-400 font-bold uppercase">{bed.allocation.studentRollNumber}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-bold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Vacant</span>
                                        )}
                                    </div>
                                    {/* Bed-level goods: Bed, Cupboard, Chair */}
                                    <div className="space-y-2">
                                    {bed.goods && bed.goods.map(good => (
                                        <GoodRow
                                            key={good._id}
                                            good={good}
                                            onChange={(goodId, field, value) => handleBedGoodChange(bed.bedId, goodId, field, value)}
                                            disabled={!floorActive}
                                        />
                                    ))}
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

// ── Student Floors Tab ───────────────────────────────────────────────────────
function StudentFloorsTab({ searchTrigger }) {
    const [wing, setWing] = useState('male');
    const [floors, setFloors] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedFloor, setSelectedFloor] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [migrating, setMigrating] = useState(false);

    // Handle incoming search trigger from parent
    useEffect(() => {
        if (searchTrigger) {
            setWing(searchTrigger.room.wing);
            const loadAndSelect = async () => {
                try {
                    // Only run this logic for room results
                    if (searchTrigger.type === 'room') {
                        const data = await api.getFloors(searchTrigger.room.wing);
                        setFloors(data.sort((a, b) => a.floorNumber - b.floorNumber));
                        const f = data.find(f => String(f._id) === String(searchTrigger.room.floor));
                        if (f) setSelectedFloor(f);
                        setSelectedRoom(searchTrigger.room);
                    }
                } catch (err) { toast.error('Search navigation failed'); }
            };
            loadAndSelect();
        }
    }, [searchTrigger]);

    const loadFloors = useCallback(async () => {
        setLoading(true);
        try {
            // API supports wing parameter
            const data = await api.getFloors(wing);
            const sorted = data.sort((a, b) => a.floorNumber - b.floorNumber);
            setFloors(sorted);
            
            // Only auto-select first floor if we don't have a floor selected 
            // AND we aren't in the middle of a search navigation
            if (sorted.length > 0 && !selectedFloor && !searchTrigger) {
                setSelectedFloor(sorted[0]);
            }
        } catch (err) {
            toast.error('Failed to load floors');
        } finally {
            setLoading(false);
        }
    }, [wing, selectedFloor, searchTrigger]);

    useEffect(() => { loadFloors(); }, [loadFloors]);

    useEffect(() => {
        if (!selectedFloor) {
            setRooms([]);
            return;
        }
        api.getRooms({ floor: selectedFloor._id })
            .then(data => setRooms(data.sort((a, b) => a.roomnumber - b.roomnumber)))
            .catch(err => toast.error(err.message));
    }, [selectedFloor]);

    const handleMigrate = async () => {
        if (!window.confirm('This will add goods data to all existing rooms that are missing it (Group-and-Squash). Continue?')) return;
        setMigrating(true);
        try {
            const result = await api.migrateRoomGoods();
            toast.success(result.message);
            loadFloors();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setMigrating(false);
        }
    };

    const occupancyCount = (room) => room.beds.filter(b => b.isOccupied).length;

    if (loading && floors.length === 0) return <div className="py-20 text-center text-slate-400 italic">Loading floors...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Wing Switcher Sub-tabs */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
                    <button
                        onClick={() => { setWing('male'); setSelectedFloor(null); setSelectedRoom(null); }}
                        className={`px-6 py-2 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${wing === 'male' ? 'bg-[#FAB95B] text-[#1A3263] shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        Male Wing
                    </button>
                    <button
                        onClick={() => { setWing('female'); setSelectedFloor(null); setSelectedRoom(null); }}
                        className={`px-6 py-2 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${wing === 'female' ? 'bg-[#FAB95B] text-[#1A3263] shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        Female Wing
                    </button>
                </div>

                {/* Migrate button */}
                <button
                    onClick={handleMigrate}
                    disabled={migrating}
                    title="Backfill/Fix goods data for existing rooms"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-black hover:bg-amber-50 hover:text-amber-700 transition-all border-none cursor-pointer disabled:opacity-50"
                >
                    <HiOutlineArrowPath className={`text-base ${migrating ? 'animate-spin' : ''}`} />
                    {migrating ? 'Migrating...' : 'Migrate Goods'}
                </button>
            </div>

            {/* Floor Selector Pills */}
            <div className="flex flex-wrap gap-2 items-center min-h-[40px]">
                {floors.length === 0 ? (
                    <span className="text-xs text-slate-400 font-bold italic">No floors found in this wing</span>
                ) : (
                    floors.map(floor => (
                        <button
                            key={floor._id}
                            onClick={() => { setSelectedFloor(floor); setSelectedRoom(null); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border-none cursor-pointer ${
                                selectedFloor?._id === floor._id
                                    ? (floor.isactive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'bg-slate-500 text-white shadow-lg')
                                    : (floor.isactive ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-70')
                            }`}
                        >
                            Floor {floor.floorNumber}
                            {!floor.isactive && <span className="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase">Inactive</span>}
                        </button>
                    ))
                )}
            </div>

            {/* Disabled floor banner */}
            {selectedFloor && !selectedFloor.isactive && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
                    <HiOutlineExclamationTriangle className="text-amber-500 text-xl shrink-0" />
                    <div>
                        <p className="text-sm font-black text-amber-700 dark:text-amber-400">Floor {selectedFloor.floorNumber} is currently disabled</p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Goods data is visible but read-only. Re-enable the floor to make changes.</p>
                    </div>
                </div>
            )}

            {/* Room Grid */}
            {selectedFloor && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {rooms.map(room => {
                        const occ = occupancyCount(room);
                        const total = room.beds.length;
                        const isFull = occ === total;
                        const isEmpty = occ === 0;
                        return (
                            <button
                                key={room._id}
                                onClick={() => setSelectedRoom(room)}
                                className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer text-left bg-white dark:bg-slate-900 hover:shadow-lg hover:-translate-y-0.5 ${
                                    isFull
                                        ? 'border-rose-200 dark:border-rose-800 hover:border-rose-400'
                                        : isEmpty
                                            ? 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                                            : 'border-amber-200 dark:border-amber-800 hover:border-amber-400'
                                }`}
                            >
                                <div className="text-xs font-black text-slate-700 dark:text-slate-200">{room.Roomid}</div>
                                <div className={`text-[10px] font-bold uppercase mt-1 ${isFull ? 'text-rose-500' : isEmpty ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {isFull ? 'Full' : isEmpty ? 'Vacant' : `${occ}/${total} occupied`}
                                </div>
                                <div className="text-[9px] text-slate-400 mt-0.5 font-bold uppercase">{room.type}</div>
                                <HiOutlinePencilSquare className="absolute top-3 right-3 text-sm text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Room Detail Modal */}
            {selectedRoom && (
                <RoomDetailModal
                    room={selectedRoom}
                    floorActive={selectedFloor?.isactive !== false}
                    onClose={() => setSelectedRoom(null)}
                />
            )}
        </div>
    );
}

// ── Main Resources Component ─────────────────────────────────────────────────
export default function Resources() {
    const [mainTab, setMainTab] = useState('common');
    const [searchCode, setSearchCode] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchTrigger, setSearchTrigger] = useState(null);

    const downloadSecureFile = async (url, filename) => {
        try {
            const token = sessionStorage.getItem('hostel_token');
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to download file');
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            toast.error(err.message || 'Download failed');
        }
    };

    const handleExport = (fmt) => {
        const url = api.getResourcesExportUrl(fmt);
        downloadSecureFile(url, `hostel_inventory_${new Date().toLocaleDateString()}.${fmt}`);
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchCode.trim()) return;
        setSearching(true);
        try {
            const result = await api.searchFurniture(searchCode.trim());
            
            if (result.type === 'room') {
                setMainTab('student');
                setSearchTrigger({ ...result, searchId: Date.now() });
                toast.success(`Found in Room ${result.room.Roomid}`);
            } else {
                setMainTab('common');
                // For common areas, we don't need a complex trigger, 
                // just switching the tab will show the items.
                // We could add highlighting here if needed.
                toast.success(`Found in ${result.item.areaName}`);
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="p-4 sm:p-10 space-y-8 w-full animate-fade-in transition-colors">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Hostel <span className="text-indigo-500 italic">Resources</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
                        Manage common area inventory and student room goods
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="relative w-full sm:w-80">
                        <HiMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search Furniture Code..."
                            className="form-input !pl-11 !py-2.5 !text-xs !rounded-2xl shadow-sm focus:!ring-indigo-500/20"
                            value={searchCode}
                            onChange={e => setSearchCode(e.target.value)}
                        />
                        {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>}
                    </form>

                    {/* Export Buttons */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none cursor-pointer shadow-sm">
                            <HiOutlineTableCells className="text-lg" /> CSV
                        </button>
                        <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none cursor-pointer shadow-sm">
                            <HiOutlineDocumentArrowDown className="text-lg" /> PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Tab Switcher */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
                <button
                    onClick={() => setMainTab('common')}
                    className={`px-6 py-2.5 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${mainTab === 'common' ? 'bg-[#FAB95B] text-[#1A3263] shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    Common Areas
                </button>
                <button
                    onClick={() => setMainTab('student')}
                    className={`px-6 py-2.5 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${mainTab === 'student' ? 'bg-[#FAB95B] text-[#1A3263] shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    Student Floors
                </button>
            </div>

            {/* Tab Content */}
            {mainTab === 'common' && <CommonAreasTab />}
            {mainTab === 'student' && <StudentFloorsTab searchTrigger={searchTrigger} />}
        </div>
    );
}
