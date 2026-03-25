export interface Toast {
	id: string;
	message: string;
	type: 'error' | 'success' | 'info';
	duration?: number;
}

let toasts = $state<Toast[]>([]);

export function getToasts(): Toast[] {
	return toasts;
}

export function showToast(
	message: string,
	type: 'error' | 'success' | 'info' = 'error',
	duration = 4000
): void {
	const id = crypto.randomUUID();
	toasts = [...toasts, { id, message, type, duration }];
	setTimeout(() => {
		toasts = toasts.filter((toast) => toast.id !== id);
	}, duration);
}

export function dismissToast(id: string): void {
	toasts = toasts.filter((toast) => toast.id !== id);
}
