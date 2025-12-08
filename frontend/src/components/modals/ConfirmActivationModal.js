import ModalShell from "./ModalShell";
import Button from "@/components/ui/Button";
import { IoCheckmarkCircleOutline } from "react-icons/io5";

export default function ConfirmActivationModal({
	isOpen,
	title = "Confirm Activation",
	description = "Are you sure you want to proceed with this activation?",
	onCancel,
	onConfirm,
	busy = false,
	mode = "auto",
}) {
	if (!isOpen) return null;

	const footer = (
		<>
			<Button variant="ghost" onClick={onCancel} disabled={busy} mode={mode}>
				Cancel
			</Button>
			<Button variant="primary" onClick={onConfirm} disabled={busy} mode={mode}>
				{busy ? "Processing..." : "Confirm"}
			</Button>
		</>
	);

	return (
		<ModalShell
			isOpen={isOpen}
			onClose={onCancel}
			title={title}
			description={description}
			footer={footer}
			mode={mode}
			role="alertdialog"
		/>
	);
}

