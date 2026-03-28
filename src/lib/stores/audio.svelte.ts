import { showToast } from './toast.svelte';

let isRecording = $state(false);
let isPlaying = $state(false);
let audioBlob = $state<Blob | null>(null);
let audioUrl = $state<string | null>(null);
let mediaRecorder = $state<MediaRecorder | null>(null);

export function getRecordingState(): {
	isRecording: boolean;
	isPlaying: boolean;
	audioBlob: Blob | null;
	audioUrl: string | null;
} {
	return { isRecording, isPlaying, audioBlob, audioUrl };
}

export async function startRecording(): Promise<void> {
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
	const chunks: Blob[] = [];

	recorder.ondataavailable = (event: BlobEvent) => {
		if (event.data.size > 0) {
			chunks.push(event.data);
		}
	};

	recorder.onstop = () => {
		const blob = new Blob(chunks, { type: 'audio/webm' });
		audioBlob = blob;
		audioUrl = URL.createObjectURL(blob);
		stream.getTracks().forEach((track) => track.stop());
	};

	mediaRecorder = recorder;
	recorder.start();
	isRecording = true;
}

export function stopRecording(): void {
	if (mediaRecorder && isRecording) {
		mediaRecorder.stop();
		isRecording = false;
		mediaRecorder = null;
	}
}

export async function playAudio(url: string): Promise<void> {
	isPlaying = true;
	const audio = new Audio(url);

	audio.onended = () => {
		isPlaying = false;
	};

	audio.onerror = () => {
		isPlaying = false;
		showToast('Audio playback failed.', 'error');
	};

	await audio.play();
}

const ttsCache = new Map<string, string>();

export async function playTTS(text: string, preGeneratedUrl?: string): Promise<void> {
	isPlaying = true;

	try {
		let url: string;

		if (preGeneratedUrl) {
			url = preGeneratedUrl;
		} else if (ttsCache.has(text)) {
			url = ttsCache.get(text)!;
		} else {
			const res = await fetch('/api/speech/tts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text })
			});

			if (!res.ok) {
				throw new Error('TTS failed');
			}

			const blob = await res.blob();
			url = URL.createObjectURL(blob);
			ttsCache.set(text, url);
		}

		const audio = new Audio(url);

		audio.onended = () => {
			isPlaying = false;
		};

		audio.onerror = () => {
			isPlaying = false;
		};

		await audio.play();
	} catch (e) {
		isPlaying = false;
		if (e instanceof DOMException && e.name === 'NotAllowedError') return;
		showToast('Audio playback failed', 'error');
	}
}

export function resetAudio(): void {
	if (audioUrl) {
		URL.revokeObjectURL(audioUrl);
	}

	audioBlob = null;
	audioUrl = null;
	isRecording = false;
	isPlaying = false;
}
