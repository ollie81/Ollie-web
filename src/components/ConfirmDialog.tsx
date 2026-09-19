import './ConfirmDialog.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Same shape as home_screen.dart's logout AlertDialog and
// settings_screen.dart's _showConfirmDialog -- reused for every
// yes/no confirmation on web (logout, clear memory) rather than the
// browser's plain confirm(), which doesn't match the app's look.
export default function ConfirmDialog({ title, message, confirmLabel, destructive, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-card__title">{title}</h2>
        <p className="confirm-card__message">{message}</p>
        <div className="confirm-card__actions">
          <button className="btn-text" onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn-text${destructive ? ' confirm-card__destructive' : ' confirm-card__accent'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
