let isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);

if (typeof window !== 'undefined') {
	const syncOnlineState = () => {
		isOnline = navigator.onLine;
	};

	window.addEventListener('online', syncOnlineState);
	window.addEventListener('offline', syncOnlineState);
}

export function getNetworkStatus(): boolean {
	return isOnline;
}
