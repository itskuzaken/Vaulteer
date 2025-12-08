import ModalShell from "./ModalShell";
import Button from "@/components/ui/Button";

export default function ApplicantStatusConfirmModal({
  isOpen,
  applicantName,
  statusLabel,
  onConfirm,
  onCancel,
  busy,
  mode = "auto",
}) {
  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      mode={mode}
      title="Confirm status change"
      description={`This will notify admins and update ${applicantName}&rsquo;s workflow immediately.`}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy} mode={mode}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy} mode={mode}>
            {busy ? "Updating" : "Yes, update"}
          </Button>
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
