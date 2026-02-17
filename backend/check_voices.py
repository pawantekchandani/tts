
import os
import sys
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

def list_voices():
    # 1. Get credentials
    speech_key = os.getenv("AZURE_SPEECH_KEY")
    service_region = os.getenv("AZURE_SPEECH_REGION")

    if not speech_key or not service_region:
        print("Error: AZURE_SPEECH_KEY or AZURE_SPEECH_REGION not set in .env")
        return

    # 2. Configure Speech Config
    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)

    # 3. Create Synthesizer (to fetch voices)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)

    # 4. Get Voices
    print("Fetching available voices from Azure...")
    result = synthesizer.get_voices_async().get()

    if result.reason == speechsdk.ResultReason.VoicesListRetrieved:
        print(f"\n--- Total Voices Found: {len(result.voices)} ---\n")
        
        # Categorize by Language
        voices_by_lang = {}
        for voice in result.voices:
            lang = voice.locale
            if lang not in voices_by_lang:
                voices_by_lang[lang] = []
            voices_by_lang[lang].append(f"{voice.local_name} ({voice.short_name}) - {voice.gender.name}")

        # Print organized list
        for lang, voices in sorted(voices_by_lang.items()):
            print(f"LANGUAGE: {lang} ({len(voices)} voices)")
            for v in sorted(voices):
                print(f"  - {v}")
            print("-" * 40)

    elif result.reason == speechsdk.ResultReason.Canceled:
        print(f"Error fetching voices: {result.error_details}")

if __name__ == "__main__":
    list_voices()
