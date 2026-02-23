import pytest
import re
from main import build_advanced_ssml

def normalize_ssml(ssml):
    """Utility to remove extra whitespace/newlines for string comparison."""
    # Remove newlines and condense multiple spaces to a single space
    ssml = ssml.replace("\n", "").replace("\r", "")
    ssml = re.sub(r'>\s+<', '><', ssml)
    ssml = re.sub(r'\s{2,}', ' ', ssml)
    return ssml.strip()

def test_build_advanced_ssml_basic():
    """Test generating basic SSML without any tags."""
    text = "Hello world."
    voice_name = "en-US-JennyNeural"
    style_degree = 1.0
    prosody = {"rate": "medium", "pitch": "medium"}
    
    ssml = build_advanced_ssml(text, voice_name, style_degree, prosody)
    normalized = normalize_ssml(ssml)
    
    expected = f"""<speak version='1.0' xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang='en-US'><voice name="en-US-JennyNeural"><prosody rate="medium" pitch="medium">Hello world.</prosody></voice></speak>"""
    assert normalized == normalize_ssml(expected)

def test_build_advanced_ssml_with_break():
    """Test generating SSML with break tags."""
    text = "Hello. [break:2s] How are you?"
    voice_name = "en-US-JennyNeural"
    style_degree = 1.0
    prosody = {"rate": "medium", "pitch": "medium"}
    
    ssml = build_advanced_ssml(text, voice_name, style_degree, prosody)
    normalized = normalize_ssml(ssml)
    
    expected = f"""<speak version='1.0' xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang='en-US'><voice name="en-US-JennyNeural"><prosody rate="medium" pitch="medium">Hello. <break time="2s" /> How are you?</prosody></voice></speak>"""
    assert normalized == normalize_ssml(expected)

def test_build_advanced_ssml_with_style():
    """Test generating SSML with style tags."""
    text = "I am so [style:sad]unhappy[/style] today."
    voice_name = "en-US-JennyNeural"
    style_degree = 1.0
    prosody = {"rate": "medium", "pitch": "medium"}
    
    ssml = build_advanced_ssml(text, voice_name, style_degree, prosody)
    normalized = normalize_ssml(ssml)
    
    # We expect the text to start in Jenny without style, 
    # then start a style, say 'unhappy', close the style,
    # then continue ' today.'
    expected = f"""<speak version='1.0' xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang='en-US'><voice name="en-US-JennyNeural"><prosody rate="medium" pitch="medium">I am so <mstts:express-as style="sad">unhappy</mstts:express-as> today.</prosody></voice></speak>"""
    assert normalized == normalize_ssml(expected)

def test_build_advanced_ssml_with_style_degree():
    """Test generating SSML with style tags and a custom style degree."""
    text = "I am so [style:cheerful]happy[/style]!"
    voice_name = "en-US-JennyNeural"
    style_degree = 2.0
    prosody = {"rate": "medium", "pitch": "medium"}
    
    ssml = build_advanced_ssml(text, voice_name, style_degree, prosody)
    normalized = normalize_ssml(ssml)
    
    expected = f"""<speak version='1.0' xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang='en-US'><voice name="en-US-JennyNeural"><prosody rate="medium" pitch="medium">I am so <mstts:express-as style="cheerful" styledegree="2.0">happy</mstts:express-as>!</prosody></voice></speak>"""
    assert normalized == normalize_ssml(expected)

def test_build_advanced_ssml_with_multiple_voices():
    """Test generating SSML with multiple voices."""
    text = "Hello form Jenny. [voice:en-US-GuyNeural]And hello from Guy.[/voice] Back to Jenny."
    voice_name = "en-US-JennyNeural"
    style_degree = 1.0
    prosody = {"rate": "medium", "pitch": "medium"}
    
    ssml = build_advanced_ssml(text, voice_name, style_degree, prosody)
    normalized = normalize_ssml(ssml)
    
    # The structure closes the Jenny voice before opening Guy, and then switches back to Jenny
    expected = f"""<speak version='1.0' xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang='en-US'><voice name="en-US-JennyNeural"><prosody rate="medium" pitch="medium">Hello form Jenny. </prosody></voice><voice name="en-US-GuyNeural"><prosody rate="medium" pitch="medium">And hello from Guy.</prosody></voice><voice name="en-US-JennyNeural"><prosody rate="medium" pitch="medium"> Back to Jenny.</prosody></voice></speak>"""
    assert normalized == normalize_ssml(expected)
