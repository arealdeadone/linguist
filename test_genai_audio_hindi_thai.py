#!/usr/bin/env python3
"""
Test Agoda GenAI Gateway audio endpoints for Hindi and Thai:
1. TTS - Generate speech via gpt-4o-mini-tts
2. STT - Transcribe back via gpt-4o-transcribe & gpt-4o-mini-transcribe
3. Verify round-trip accuracy
"""

import os
import sys
import time
from pathlib import Path

GENAI_BASE_URL = "https://genai-gateway.agoda.is/v1"
API_KEY = os.environ.get("AGODA_GENAI_API_KEY")

if not API_KEY:
    print("ERROR: AGODA_GENAI_API_KEY environment variable not set")
    sys.exit(1)

try:
    from openai import OpenAI
except ImportError:
    print("Installing openai package...")
    os.system(f"{sys.executable} -m pip install openai")
    from openai import OpenAI

client = OpenAI(api_key=API_KEY, base_url=GENAI_BASE_URL)

OUTPUT_DIR = Path("test_audio_output_hindi_thai")
OUTPUT_DIR.mkdir(exist_ok=True)

HINDI_PHRASES = [
    ("नमस्ते, आप कैसे हैं?", "Hello, how are you?"),
    ("मुझे हिंदी सीखनी है", "I want to learn Hindi"),
    ("आज मौसम बहुत अच्छा है", "The weather is very nice today"),
    ("कृपया इसे दोबारा कहिए", "Please say that again"),
    ("मैं चीनी भाषा सीख रहा हूँ", "I am learning Chinese language"),
]

THAI_PHRASES = [
    ("สวัสดีครับ คุณสบายดีไหม", "Hello, how are you?"),
    ("ผมอยากเรียนภาษาไทย", "I want to learn Thai"),
    ("วันนี้อากาศดีมาก", "The weather is very nice today"),
    ("กรุณาพูดอีกครั้ง", "Please say that again"),
    ("ฉันกำลังเรียนภาษาเตลูกู", "I am learning Telugu language"),
]


def test_tts(text: str, lang_label: str, lang_full: str, index: int) -> Path | None:
    filename = OUTPUT_DIR / f"{lang_label}_{index}.mp3"
    print(f"\n  TTS: {lang_label} phrase {index + 1}")
    print(f"    Input: {text}")

    try:
        start = time.time()
        response = client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice="coral",
            input=text,
            instructions=f"Speak naturally in {lang_full}. Use clear pronunciation suitable for language learners.",
        )
        elapsed = time.time() - start
        response.stream_to_file(str(filename))
        size_kb = filename.stat().st_size / 1024
        print(f"    ✅ {elapsed:.2f}s | {size_kb:.1f} KB | {filename}")
        return filename
    except Exception as e:
        print(f"    ❌ FAILED: {e}")
        return None


def test_stt(audio_path: Path, model: str, expected_text: str, lang: str) -> str | None:
    print(f"    STT ({model}):")
    print(f"      Expected: {expected_text}")

    try:
        start = time.time()
        with open(audio_path, "rb") as f:
            transcript = client.audio.transcriptions.create(
                model=model,
                file=f,
                language=lang,
            )
        elapsed = time.time() - start
        result = transcript.text
        match = "EXACT" if result.strip() == expected_text.strip() else "DIFF"
        print(f"      ✅ {elapsed:.2f}s | {match}")
        print(f"      Got:      {result}")
        return result
    except Exception as e:
        print(f"      ❌ FAILED: {e}")
        return None


def main():
    print("=" * 60)
    print("Agoda GenAI Gateway — Hindi & Thai Audio Tests")
    print(f"Base URL: {GENAI_BASE_URL}")
    print(f"API Key:  {API_KEY[:12]}...{API_KEY[-4:]}")
    print("=" * 60)

    stt_models = ["gpt-4o-transcribe", "gpt-4o-mini-transcribe"]
    results = {"tts": [], "stt": []}

    for lang_label, lang_code, lang_full, phrases in [
        ("hindi", "hi", "Hindi", HINDI_PHRASES),
        ("thai", "th", "Thai", THAI_PHRASES),
    ]:
        print(f"\n\n{'=' * 60}")
        print(f"{lang_full.upper()} TESTS")
        print(f"{'=' * 60}")

        for i, (text, english_desc) in enumerate(phrases):
            audio_path = test_tts(text, lang_label, lang_full, i)
            if not audio_path:
                results["tts"].append((lang_label, i, False))
                continue
            results["tts"].append((lang_label, i, True))

            for model in stt_models:
                transcript = test_stt(audio_path, model, text, lang_code)
                results["stt"].append((lang_label, model, i, transcript is not None, transcript, text))

    print(f"\n\n{'=' * 60}")
    print("SUMMARY")
    print(f"{'=' * 60}")

    print("\nTTS Results:")
    for lang, idx, success in results["tts"]:
        status = "✅" if success else "❌"
        print(f"  {status} {lang} phrase {idx + 1}")

    print("\nSTT Results:")
    for lang, model, idx, success, transcript, expected in results["stt"]:
        status = "✅" if success else "❌"
        match = ""
        if success and transcript:
            match = " [EXACT]" if transcript.strip() == expected.strip() else " [DIFF]"
        print(f"  {status} {lang} phrase {idx + 1} | {model:25s} | {(transcript or 'FAILED')}{match}")

    print(f"\nAudio files saved in: {OUTPUT_DIR.absolute()}")


if __name__ == "__main__":
    main()
