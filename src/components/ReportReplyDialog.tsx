import { FormEvent, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { REPORT_REASONS, type ReportReason } from '../lib/api';
import './ConfirmDialog.css';
import './ReportReplyDialog.css';

export const MAX_REPORT_DETAILS = 500;

interface ReportReplyDialogProps {
  onSend: (reason: ReportReason, details: string | null) => void;
  onCancel: () => void;
}

// "What's wrong with this reply?" -- opened from the flag beside an
// Ollie reply in Chat.tsx. Same card as ConfirmDialog; the Android
// app's version is lib/widgets/report_reply.dart, with the same
// reasons in the same order.
export default function ReportReplyDialog({ onSend, onCancel }: ReportReplyDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const titleId = useId();
  const introId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason) return;
    onSend(reason, details.trim() || null);
  }

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <form
        className="confirm-card report-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={introId}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 id={titleId} className="confirm-card__title">
          {t('chat.report.title')}
        </h2>
        <p id={introId} className="confirm-card__message">
          {t('chat.report.intro')}
        </p>
        <div className="report-reasons" role="radiogroup" aria-labelledby={titleId}>
          {REPORT_REASONS.map((r, i) => (
            <label key={r} className="report-reason">
              <input
                type="radio"
                name="report-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                autoFocus={i === 0}
              />
              <span>{t(`chat.report.reasons.${r}`)}</span>
            </label>
          ))}
        </div>
        <textarea
          className="field report-details"
          rows={2}
          maxLength={MAX_REPORT_DETAILS}
          placeholder={t('chat.report.detailsPlaceholder')}
          aria-label={t('chat.report.detailsPlaceholder')}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <div className="confirm-card__actions">
          <button type="button" className="btn-text" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-text confirm-card__accent" disabled={!reason}>
            {t('chat.report.send')}
          </button>
        </div>
      </form>
    </div>
  );
}
