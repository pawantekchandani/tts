
import boto3
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

def check_indian_voices():
    try:
        client = boto3.client(
            'polly',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )

        response = client.describe_voices(LanguageCode='en-IN')
        
        neural_voices = []
        standard_voices = []
        
        print("\n--- Indian English (en-IN) Voices ---\n")
        
        for voice in response['Voices']:
            name = voice['Name']
            gender = voice['Gender']
            engines = voice['SupportedEngines']
            
            voice_info = f"- {name} ({gender})"
            
            if 'neural' in engines:
                neural_voices.append(voice_info)
            if 'standard' in engines:
                standard_voices.append(voice_info)
                
            print(f"Name: {name}")
            print(f"Gender: {gender}")
            print(f"Supported Engines: {', '.join(engines)}")
            print("-" * 30)

        print(f"\nSummary:")
        print(f"Total Standard Voices: {len(standard_voices)}")
        print("\n".join(standard_voices))
        
        print(f"\nTotal Neural Voices: {len(neural_voices)}")
        print("\n".join(neural_voices))

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_indian_voices()
