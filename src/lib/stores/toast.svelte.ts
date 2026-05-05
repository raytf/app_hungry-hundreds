/**
 * Toast Store — Phase F
 *
 * Svelte 5 $state-based store for transient notification toasts.
 * One toast at a time; auto-dismisses after 2.5 s by default.
 *
 * Usage:
 *   showToast('Habit marked complete!');
 *   showToast({ message: 'Save your progress', actionLabel: 'Create account', onAction: () => {} });
 */

export interface ToastOptions {
	message: string;
	actionLabel?: string;
	onAction?: () => void;
	durationMs?: number;
}

type ToastInput = string | ToastOptions;

function createToastStore() {
	let message = $state('');
	let actionLabel = $state<string | null>(null);
	let action = $state<(() => void) | null>(null);
	let visible = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	function clearTimer() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function scheduleHide(durationMs: number) {
		timer = setTimeout(() => {
			visible = false;
			actionLabel = null;
			action = null;
			timer = null;
		}, durationMs);
	}

	return {
		get message() {
			return message;
		},
		get visible() {
			return visible;
		},
		get actionLabel() {
			return actionLabel;
		},
		get hasAction() {
			return Boolean(actionLabel && action);
		},

		/** Show a toast message. Resets the timer if one is already visible. */
		show(input: ToastInput) {
			const toast = typeof input === 'string' ? { message: input } : input;
			clearTimer();
			message = toast.message;
			actionLabel = toast.actionLabel ?? null;
			action = toast.onAction ?? null;
			visible = true;
			scheduleHide(toast.durationMs ?? (toast.onAction ? 4500 : 2500));
		},

		/** Immediately hide the toast. */
		hide() {
			clearTimer();
			visible = false;
			actionLabel = null;
			action = null;
		},

		handleAction() {
			const callback = action;
			this.hide();
			callback?.();
		}
	};
}

export const toastStore = createToastStore();

/** Show a transient toast notification. */
export function showToast(message: ToastInput): void {
	toastStore.show(message);
}
