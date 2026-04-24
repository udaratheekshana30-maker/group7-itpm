import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import { HiOutlineXMark } from 'react-icons/hi2'

// Format room number as M1/F1 based on wing
const fmtRoom = (wing, roomnumber) => {
    const prefix = wing === 'female' ? 'F' : 'M';
    return `${prefix}${roomnumber}`;
};

export default function RoomAllocation({ allocatingStudent, setAllocatingStudent }) {
    const [wing, setWing] = useState(allocatingStudent?.wing || 'male')
    const [floors, setFloors] = useState([])
    const [selectedFloor, setSelectedFloor] = useState(null)
    const [rooms, setRooms] = useState([])
    const [suggestedRoomIds, setSuggestedRoomIds] = useState(new Set())
    const [degreeMatchRoomIds, setDegreeMatchRoomIds] = useState(new Set())
    const [loading, setLoading] = useState(true)
    const [confirmBed, setConfirmBed] = useState(null)

    useEffect(() => {
        if (allocatingStudent) setWing(allocatingStudent.wing?.toLowerCase() || 'male')
    }, [allocatingStudent])

    const loadFloors = useCallback(async () => {
        try {
            const data = await api.getFloors(wing)
            const active = data.filter(f => f.isactive)
            setFloors(active)
            if (active.length > 0 && !active.find(f => f._id === selectedFloor)) {
                setSelectedFloor(active[0]._id)
            }
        } catch { toast.error('Failed to load floors') }
    }, [wing])

    useEffect(() => { setSelectedFloor(null); loadFloors() }, [wing, loadFloors])

    const loadRooms = useCallback(async () => {
        if (!selectedFloor) return
        try {
            setLoading(true)
            const data = await api.getRooms({ floor: selectedFloor, activeOnly: 'true' })
            setRooms(data)
        } catch { toast.error('Failed to load rooms') }
        finally { setLoading(false) }
    }, [selectedFloor])

    useEffect(() => { loadRooms() }, [loadRooms])

    useEffect(() => {
        if (allocatingStudent) loadSuggestions()
    }, [allocatingStudent, wing])

    const loadSuggestions = async () => {
        if (!allocatingStudent) return
        try {
            const data = await api.getSuggestions(wing, allocatingStudent.degree)
            // suggestedRoomIds is for all suggestions (indigo border)
            // degreeMatchRoomIds is for actual degree matches (red border)
            setSuggestedRoomIds(new Set(data.map(s => s.room._id)))
            setDegreeMatchRoomIds(new Set(data.filter(s => s.degreeMatch).map(s => s.room._id)))
        } catch { console.error('Failed to load suggestions') }
    }

    const handleSelectBed = (room, bedId) => {
        if (!allocatingStudent) { toast.error('Select a student first from Student Applications'); return }
        setConfirmBed({ room, bedId })
    }

    const handleConfirmAllocation = async () => {
        if (!confirmBed || !allocatingStudent) return
        try {
            await api.allocate({ studentId: allocatingStudent._id, roomId: confirmBed.room._id, bedId: confirmBed.bedId })
            toast.success(`Allocated ${allocatingStudent.name} to Room ${fmtRoom(wing, confirmBed.room.roomnumber)}, Bed ${confirmBed.bedId}`)
            setAllocatingStudent(null); setConfirmBed(null); loadRooms()
        } catch (err) { toast.error(err.message) }
    }

    return (
        <div className="animate-fade-in">

            {/* Active Student Banner */}
            {allocatingStudent ? (
                <div className="allocation-banner animate-slide-up">
                    <div className="student-info">
                        <div>
                            <div className="student-name">Allocating: {allocatingStudent.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="student-meta">{allocatingStudent.wing} wing</span>
                                <span className={`badge ${allocatingStudent.paymentStatus === 'success' ? 'badge-success' :
                                    allocatingStudent.paymentStatus === 'rejected' ? 'badge-rejected' : 'badge-warning'
                                    } shadow-sm scale-90 origin-left`}>
                                    {allocatingStudent.paymentStatus === 'success' ? 'Paid' :
                                        allocatingStudent.paymentStatus === 'rejected' ? 'Rejected' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-sm text-indigo-950 font-bold border border-indigo-950/20 hover:bg-black/5" onClick={() => setAllocatingStudent(null)}>
                        <HiOutlineXMark /> Cancel
                    </button>
                </div>
            ) : (
                <div className="empty-state mb-6" style={{ padding: '40px' }}>
                    <div className="empty-icon">🛏️</div>
                    <h3>No Student Selected</h3>
                    <p>Go to Student Applications and click "Allocate" on a payment-verified student</p>
                </div>
            )}

            {/* Wing Toggle */}
            {!allocatingStudent ? (
                <div className="wing-tabs">
                    <button className={`wing-tab ${wing === 'male' ? 'active' : ''}`} onClick={() => setWing('male')}>Male Wing</button>
                    <button className={`wing-tab ${wing === 'female' ? 'active' : ''}`} onClick={() => setWing('female')}>Female Wing</button>
                </div>
            ) : (
                <div className="text-center mb-5">
                    <span className="badge badge-neutral text-[13px] py-2 px-4">Locked to {wing === 'male' ? 'Male' : 'Female'} Wing</span>
                </div>
            )}

            {/* Floor Selector */}
            {floors.length > 0 && (
                <div className="floor-selector">
                    {floors.map(f => (
                        <button key={f._id} className={`floor-btn ${selectedFloor === f._id ? 'active' : ''}`} onClick={() => setSelectedFloor(f._id)}>
                            Floor {f.floorNumber}
                        </button>
                    ))}
                </div>
            )}

            {floors.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">🏗️</div><h3>No Active Floors</h3><p>Add and activate floors in Room Management first</p></div>
            ) : loading ? (
                <div className="text-center py-16 text-slate-400">Loading rooms...</div>
            ) : (
                <>
                    {allocatingStudent && (suggestedRoomIds.size > 0 || degreeMatchRoomIds.size > 0) && (
                        <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-4 p-3.5 bg-indigo-50 dark:bg-indigo-500/5 rounded-xl border border-indigo-200 dark:border-indigo-500/10 font-medium">
                            {degreeMatchRoomIds.size > 0 ? (
                                <span><strong className="text-red-500">SMART SUGGESTION:</strong> Rooms with a <strong className="text-slate-800 dark:text-slate-200">{allocatingStudent.degree} student and at least one free bed</strong> are highlighted with a <span className="text-red-500 font-bold underline">RED BORDER</span>.</span>
                            ) : (
                                <span>💡 Suggested rooms for <strong className="text-slate-800 dark:text-slate-200">{allocatingStudent.degree}</strong> students are highlighted. Click any green bed to allocate.</span>
                            )}
                        </div>
                    )}

                    <div className="theater-layout">
                        {rooms.map(room => (
                            <div key={room._id} className={`theater-room ${degreeMatchRoomIds.has(room._id) ? 'degree-match' : suggestedRoomIds.has(room._id) ? 'suggested' : ''}`}>
                                <div className="room-label">{fmtRoom(room.wing, room.roomnumber)}</div>
                                <div className="room-type-label">{room.type}</div>
                                <div className="theater-beds">
                                    {room.beds.map(bed => (
                                        <div
                                            key={bed.bedId}
                                            className={`theater-bed ${bed.isOccupied ? 'occupied' : 'available'}`}
                                            onClick={() => !bed.isOccupied && handleSelectBed(room, bed.bedId)}
                                            title={bed.isOccupied ? `Occupied` : `Assign Bed ${bed.bedId}`}
                                        >
                                            <div className="bed-label">{bed.bedId}</div>
                                            <div className="bed-status-text">{!bed.isOccupied ? 'Free' : 'Taken'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {rooms.length === 0 && (
                            <div className="col-span-full text-center py-12 text-slate-400">No active rooms on this floor</div>
                        )}
                    </div>
                </>
            )}

            {/* Confirm Modal */}
            {confirmBed && (
                <div className="modal-overlay" onClick={() => setConfirmBed(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Confirm Allocation</h3>
                            <button className="modal-close" onClick={() => setConfirmBed(null)}>✕</button>
                        </div>
                        <div className="student-detail-grid">
                            {[
                                ['Student', allocatingStudent?.name],
                                ['Degree', allocatingStudent?.degree],
                                ['Room', `${fmtRoom(wing, confirmBed.room.roomnumber)} (${confirmBed.room.type})`],
                                ['Bed', `Bed ${confirmBed.bedId}`],
                            ].map(([l, v]) => (
                                <div key={l} className="detail-item">
                                    <div className="detail-label">{l}</div>
                                    <div className="detail-value">{v}</div>
                                </div>
                            ))}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary btn-md" onClick={() => setConfirmBed(null)}>Cancel</button>
                            <button className="btn btn-success btn-md" onClick={handleConfirmAllocation}>✓ Confirm Allocation</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
