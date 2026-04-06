/**
 * Toast Store — Phase F
 *
 * Svelte 5 $state-based store for transient notification toasts.
 * One toast at a time; auto-dismisses after 2.5 s.
 *
 * Usage:
 *   showToast('Habit marked complete!');
 */

function createToastStore() {
	let message = $state('');
	let visible = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	return {
		get message() {
			return message;
		},
		get visible() {
			return visible;
		},

		/** Show a toast message. Resets the timer if one is already visible. */
		show(msg: string) {
			if (timer) clearTimeout(timer);
			message = msg;
			visible = true;
			timer = setTimeout(() => {
				visible = false;
				timer = null;
			}, 2500);
		},

		/** Immediately hide the toast. */
		hide() {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			visible = false;
		}
	};
}

export const toastStore = createToastStore();

/** Show a transient toast notification. Auto-dismisses after 2.5 s. */
export function showToast(message: string): void {
	toastStore.show(message);
}
