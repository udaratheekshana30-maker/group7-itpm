import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import { HiPlus, HiChevronDown, HiChevronUp, HiTrash } from 'react-icons/hi2'
import ConfirmModal from '../components/ConfirmModal'

// Format room number as M1/F1 based on wing
const fmtRoom = (wing, roomnumber) => {
    const prefix = wing === 'female' ? 'F' : 'M';
    return `${prefix}${roomnumber}`;
};

export default function RoomManagement() {
    const [wing, setWing] = useState('male')
    const [floors, setFloors] = useState([])
    const [floorRooms, setFloorRooms] = useState({})
    const [expandedFloor, setExpandedFloor] = useState(null)
    const [loading, setLoading] = useState(true)
    const [editingRoom, setEditingRoom] = useState(null)
    const [editForm, setEditForm] = useState({ roomnumber: '', type: 'double' })
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, data: null })
    const [isAddFloorModalOpen, setIsAddFloorModalOpen] = useState(false)
    const [selectedFloors, setSelectedFloors] = useState([])
    const [isAddingFloor, setIsAddingFloor] = useState(false)

    const loadFloors = useCallback(async () => {
        try {
            setLoading(true)
            const data = await api.getFloors(wing)
            setFloors(data)
            const roomMap = {}
            for (const floor of data) {
                const rooms = await api.getRooms({ floor: floor._id })
                roomMap[floor._id] = rooms
            }
            setFloorRooms(roomMap)
        } catch { toast.error('Failed to load floors') }
        finally { setLoading(false) }
    }, [wing])

    useEffect(() => { loadFloors() }, [loadFloors])

    const handleAddFloors = async () => {
        if (selectedFloors.length === 0 || isAddingFloor) return
        try {
            setIsAddingFloor(true)
            await api.addFloorsBulk({ wing, floorNumbers: selectedFloors })
            toast.success(`${selectedFloors.length} floors added`)
            setIsAddFloorModalOpen(false)
            setSelectedFloors([])
            loadFloors()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setIsAddingFloor(false)
        }
    }

    const handleToggleFloor = async (floor) => {
        // If ACTIVATING, do it directly
        if (!floor.isactive) {
            try {
                await api.toggleFloor(floor._id)
                toast.success(`Floor ${floor.floorNumber} activated`)
                loadFloors()
            } catch (err) { toast.error(err.message) }
            return
        }

        // If DEACTIVATING, show confirmation modal
        setConfirmModal({
            isOpen: true,
            data: floor,
            title: 'Deactivate Floor',
            message: `Are you sure you want to deactivate Floor ${floor.floorNumber}? No new students can be allocated, and existing rooms will also be deactivated.`,
            onConfirm: async () => {
                try {
                    await api.toggleFloor(floor._id)
                    toast.success(`Floor ${floor.floorNumber} deactivated`)
                    loadFloors()
                } catch (err) { toast.error(err.message) }
                setConfirmModal({ isOpen: false, data: null })
            }
        })
    }

    const handleDeleteFloor = (floor) => {
        setConfirmModal({
            isOpen: true,
            data: floor,
            title: 'Delete Floor',
            message: `Are you sure you want to delete Floor ${floor.floorNumber} and all its rooms? This action cannot be undone.`,
            onConfirm: () => executeDeleteFloor(floor)
        })
    }

    const executeDeleteFloor = async (floor) => {
        try {
            await api.deleteFloor(floor._id)
            toast.success(`Floor ${floor.floorNumber} deleted`)
            loadFloors()
        } catch (err) { toast.error(err.message) }
    }

    const handleToggleRoom = async (room) => {
        try {
            await api.toggleRoom(room._id)
            toast.success(`Room ${fmtRoom(room.wing, room.roomnumber)} ${room.isactive ? 'deactivated' : 'activated'}`)
            loadFloors()
        } catch (err) { toast.error(err.message) }
    }

    const handleEditRoom = (room) => {
        setEditingRoom(room)
        setEditForm({
            roomnumber: room.roomnumber,
            type: room.type,
            isactive: room.isactive,
            beds: room.beds.map(b => ({ bedId: b.bedId, isOccupied: b.isOccupied }))
        })
    }

    const handleSaveRoom = async () => {
        try {
            await api.updateRoom(editingRoom._id, editForm)
            if (editForm.isactive !== editingRoom.isactive) await api.toggleRoom(editingRoom._id)
            toast.success(`Room ${editForm.roomnumber} updated`)
            setEditingRoom(null)
            loadFloors()
        } catch (err) { toast.error(err.message) }
    }


    return (
        <div className="animate-fade-in">

            {/* Controls */}
            <div className="flex items-center justify-between mb-6">
                <div className="wing-tabs" style={{ marginBottom: 0 }}>
                    <button className={`wing-tab ${wing === 'male' ? 'active' : ''}`} onClick={() => setWing('male')}>Male Wing</button>
                    <button className={`wing-tab ${wing === 'female' ? 'active' : ''}`} onClick={() => setWing('female')}>Female Wing</button>
                </div>
                <button className="btn btn-primary btn-md" onClick={() => setIsAddFloorModalOpen(true)}>
                    <HiPlus /> Add Floor
                </button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
                </div>
            ) : floors.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"></div>
                    <h3>No Floors Added</h3>
                    <p>Click "Add Floor" to create the first floor for the {wing} wing</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {floors.map(floor => {
                        const rooms = floorRooms[floor._id] || []
                        const isExpanded = expandedFloor === floor._id
                        const activeRooms = rooms.filter(r => r.isactive).length
                        const totalBeds = rooms.reduce((s, r) => s + r.beds.length, 0)
                        const occupiedBeds = rooms.reduce((s, r) => s + r.beds.filter(b => b.isOccupied).length, 0)

                        return (
                            <div key={floor._id} className={`floor-card ${!floor.isactive ? 'inactive' : ''}`}>
                                <div className="floor-card-header" onClick={() => setExpandedFloor(isExpanded ? null : floor._id)}>
                                    <div className="floor-title">
                                        <div className="floor-number">{floor.floorNumber}</div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Floor {floor.floorNumber} <span className="text-[10px] text-slate-400 font-mono ml-2">({floor.floorID})</span></div>
                                            <div className="floor-meta">{rooms.length} rooms ({activeRooms} active) · {occupiedBeds}/{totalBeds} beds</div>
                                        </div>
                                    </div>
                                    <div className="floor-actions" onClick={e => e.stopPropagation()}>
                                        <label className="toggle" title={floor.isactive ? 'Deactivate' : 'Activate'}>
                                            <input type="checkbox" checked={floor.isactive} onChange={(e) => {
                                                e.preventDefault(); // Prevent automatic toggle before confirmation
                                                handleToggleFloor(floor);
                                            }} />
                                            <span className="toggle-slider" />
                                        </label>
                                        <span className={`text-xs font-semibold min-w-[50px] ${floor.isactive ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {floor.isactive ? 'Active' : 'Off'}
                                        </span>
                                        <button className="btn btn-ghost btn-xs" onClick={() => handleDeleteFloor(floor)}><HiTrash /></button>
                                        <span className="text-slate-400 dark:text-slate-500 text-base">
                                            {isExpanded ? <HiChevronUp /> : <HiChevronDown />}
                                        </span>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="floor-content animate-fade-in">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rooms on Floor {floor.floorNumber}</span>
                                        </div>


                                        <div className="room-grid">
                                            {rooms.map(room => (
                                                <div key={room._id} className={`room-chip ${!room.isactive ? 'inactive' : ''}`} onClick={() => handleEditRoom(room)}>
                                                    <div className="room-num">{room.Roomid || room.roomnumber}</div>
                                                    <div className="room-type">{room.type}</div>
                                                    <div className="room-beds">
                                                        {room.beds.map(bed => (
                                                            <div key={bed.bedId} className={`bed-dot ${bed.isOccupied ? 'occupied' : 'available'}`} title={`Bed ${bed.bedId}: ${bed.isOccupied ? 'Occupied' : 'Available'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Edit Room Modal */}
            {editingRoom && (
                <div className="modal-overlay" onClick={() => setEditingRoom(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Room {editingRoom.Roomid || fmtRoom(editingRoom.wing, editingRoom.roomnumber)}</h3>
                            <button className="modal-close" onClick={() => setEditingRoom(null)}>✕</button>
                        </div>
                        <div className="modal-content space-y-4">
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="toggle">
                                        <input type="checkbox" checked={editForm.isactive} onChange={e => setEditForm({ ...editForm, isactive: e.target.checked })} />
                                        <span className="toggle-slider" />
                                    </div>
                                    <span className={`text-sm font-semibold ${editForm.isactive ? 'text-emerald-500' : 'text-slate-400'}`}>
                                        {editForm.isactive ? 'Active' : 'Inactive'}
                                    </span>
                                </label>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Room Number</label>
                                <input className="form-input" type="number" value={editForm.roomnumber} onChange={e => setEditForm({ ...editForm, roomnumber: parseInt(e.target.value) })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select className="form-select" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                                    <option value="double">Double (2 beds)</option>
                                    <option value="single">Single (1 bed)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Beds</label>
                                <div className="bed-list">
                                    {editForm.beds?.map((bed, idx) => (
                                        <div key={bed.bedId} className="bed-item">
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bed {bed.bedId}</span>
                                            <div className="bed-actions">
                                                <span className={`badge ${!bed.isOccupied ? 'badge-success' : 'badge-danger'}`}>{bed.isOccupied ? 'occupied' : 'available'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary btn-md" onClick={() => setEditingRoom(null)}>Cancel</button>
                            <button className="btn btn-primary btn-md" onClick={handleSaveRoom}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />

            {/* Add Floor Modal */}
            {isAddFloorModalOpen && (
                <div className="modal-overlay" onClick={() => setIsAddFloorModalOpen(false)}>
                    <div className="modal max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Floors to {wing === 'male' ? 'Male' : 'Female'} Wing</h3>
                            <button className="modal-close" onClick={() => setIsAddFloorModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-content">
                            <p className="text-sm text-slate-500 mb-6">Select floors to add. Floors already in the system are disabled.</p>

                            <div className="grid grid-cols-4 gap-4 mb-8">
                                {[2, 3, 4, 5, 6, 7, 8].map(num => {
                                    const exists = floors.some(f => f.floorNumber === num)
                                    const isSelected = selectedFloors.includes(num)

                                    return (
                                        <button
                                            key={num}
                                            disabled={exists}
                                            onClick={() => {
                                                if (isSelected) setSelectedFloors(selectedFloors.filter(n => n !== num))
                                                else setSelectedFloors([...selectedFloors, num])
                                            }}
                                            className={`h-16 rounded-xl flex flex-col items-center justify-center transition-all border-2 cursor-pointer
                                                ${exists
                                                    ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 opacity-60 shadow-inner'
                                                    : isSelected
                                                        ? 'bg-[#FAB95B]/10 dark:bg-[#FAB95B]/5 border-[#FAB95B] text-[#1A3263] dark:text-[#FAB95B] font-bold shadow-lg shadow-[#FAB95B]/20'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#FAB95B]/50 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            <span className="text-xs uppercase tracking-wider mb-0.5">Floor</span>
                                            <span className="text-xl font-black">{num}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    {selectedFloors.length} floor{selectedFloors.length !== 1 ? 's' : ''} selected
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setIsAddFloorModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        disabled={selectedFloors.length === 0 || isAddingFloor}
                                        onClick={handleAddFloors}
                                    >
                                        {isAddingFloor ? 'Adding...' : 'Confirm & Add'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
