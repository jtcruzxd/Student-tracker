import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

export default function ConfirmDialog({
  open, onClose, onConfirm, title = 'Confirm Action',
  message, confirmLabel = 'Delete', loading
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={24} className="text-red-600" />
        </div>
        <p className="text-gray-600 text-sm">{message}</p>
        <div className="flex gap-3 w-full">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-danger flex-1" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
