
import os
import sys
import io
import traceback

# Patched import logic for Python 3.13
import site
# Usually pydub is in site-packages
# We assume pydub is installed and patched correctly now.

try:
    from pydub import AudioSegment
    from pydub.utils import which
    print("Successfully imported pydub")
except ImportError:
    print("Failed to import pydub")
    traceback.print_exc()
    sys.exit(1)

def test_pydub():
    print("Checking for ffmpeg...")
    ffmpeg_path = which("ffmpeg")
    if ffmpeg_path:
        print(f"ffmpeg found at: {ffmpeg_path}")
    else:
        print("ffmpeg NOT found in PATH")
        # Try to suggest common paths
        if os.path.exists(r"C:\Program Files\ffmpeg\bin\ffmpeg.exe"):
             print("Found at default location but not in PATH.")
        return

    print("Creating dummy audio segment...")
    try:
        # Create silent audio (1 second)
        segment1 = AudioSegment.silent(duration=1000)
        print("Segment 1 created (silent)")
        
        # Simulate loading from BytesIO (like from Polly)
        # Since we can't easily generate MP3 bytes without calling Polly or having a file,
        # we'll export the silent segment to MP3 bytes first.
        
        mp3_buffer = io.BytesIO()
        segment1.export(mp3_buffer, format="mp3")
        mp3_bytes = mp3_buffer.getvalue()
        print(f"Generated {len(mp3_bytes)} bytes of MP3 data")
        
        # Now try to load it back
        input_buffer = io.BytesIO(mp3_bytes)
        loaded_segment = AudioSegment.from_file(input_buffer, format="mp3")
        print("Successfully loaded segment from BytesIO")
        
        # Combine
        combined = segment1 + loaded_segment
        print("Successfully combined segments")
        
        # Export
        combined.export("test_output.mp3", format="mp3")
        print("Successfully exported to test_output.mp3")
        
        # Cleanup
        if os.path.exists("test_output.mp3"):
            os.remove("test_output.mp3")
            print("Cleaned up test file")
            
    except Exception as e:
        print(f"Error during pydub operations: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_pydub()
