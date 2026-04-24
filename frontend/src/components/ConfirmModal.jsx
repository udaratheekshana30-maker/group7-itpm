import { HiExclamationTriangle, HiTrash, HiCheck, HiXMark } from 'react-icons/hi2'

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger' // 'danger' | 'warning' | 'success'
}) {
    if (!isOpen) return null

    const iconMap = {
        danger: <HiTrash className="text-rose-500" />,
        warning: <HiExclamationTriangle className="text-[#FAB95B]" />,
        success: <HiCheck className="text-emerald-500" />
    }

    const btnClassMap = {
        danger: 'btn-danger shadow-rose-500/20 hover:shadow-rose-500/40',
        warning: 'btn-primary shadow-[#FAB95B]/20 hover:shadow-[#FAB95B]/40',
        success: 'btn-success shadow-emerald-500/20 hover:shadow-emerald-500/40'
    }

    return (
        <div className="modal-overlay z-[100] animate-fade-in" onClick={onClose}>
            <div className="confirm-modal animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="confirm-modal-icon">
                    {iconMap[type]}
                </div>

                <h3 className="confirm-modal-title">{title}</h3>
                <p className="confirm-modal-message">{message}</p>

                <div className="confirm-modal-actions">
                    <button className="confirm-btn-cancel" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button className={`confirm-btn-action ${btnClassMap[type]}`} onClick={() => {
                        onConfirm()
                        onClose()
                    }}>
                        {confirmText}
                    </button>
                </div>

                <button className="confirm-modal-close" onClick={onClose}>
                    <HiXMark />
                </button>
            </div>
        </div>
    )
}
