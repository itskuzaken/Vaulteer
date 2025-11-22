import ModalShell from "./ModalShell";

export default function ApplicantStatusConfirmModal({
  isOpen,
  applicantName,
  statusLabel,
  onConfirm,
  onCancel,
  busy,
}) {
  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      title="Confirm status change"
      description={`This will notify admins and update ${applicantName}&rsquo;s workflow immediately.`}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Updating" : "Yes, update"}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        Are you sure you want to set <strong>{applicantName}</strong>&rsquo;s
        application status to
        <strong> {statusLabel}</strong>? This cannot be undone.
      </p>
    </ModalShell>
  );
}
