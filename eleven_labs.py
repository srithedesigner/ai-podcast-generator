# src/services/voice_over_generation/elevenlabs_t2s.py
import aiohttp
from pathlib import Path
from fastapi import HTTPException
import logging
import os
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
from models import ElevenLabsVoiceIdentifier 

ELEVEN_TURBO_V2_5 = "eleven_turbo_v2_5"
ELVEN_FLASH_V2_5 = "eleven_flash_v2_5"

load_dotenv()

async def elevenlabs_text_to_speech(script: str, voice: ElevenLabsVoiceIdentifier, is_custom: bool, output_file_path: str):
    logger.info("Starting Eleven Labs text-to-speech conversion.")

    api_key = os.getenv("ELEVEN_LABS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not found in environment variables.")
    logger.info("API key used: ELEVEN_LABS_API_KEY")

    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }
    
    speech_file_path = Path(output_file_path)
    speech_file_path.parent.mkdir(parents=True, exist_ok=True)
    logger.debug(f"Output file path set to: {speech_file_path}")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice.value}"

    data = {
        "text": script,
        "model_id": ELVEN_FLASH_V2_5,
        "voice_settings": {
            "speed": 1.1,
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=data) as response:
                if response.status == 200:
                    logger.info("Received successful response from Eleven Labs API.")
                    with open(speech_file_path, 'wb') as f:
                        while True:
                            chunk = await response.content.read(1024)
                            if not chunk:
                                break
                            f.write(chunk)
                    logger.info(f"Audio file written to: {output_file_path}")
                    return output_file_path
                else:
                    error_message = await response.text()
                    if response.status == 503:
                        logger.error("Eleven Labs API service unavailable")
                        raise HTTPException(
                            status_code=503,
                            detail={
                                "error": "service_unavailable",
                                "message": "Service temporarily unavailable",
                                "retry_after": "3600",
                                "voice_id": voice.value,
                                "is_custom": is_custom
                            }
                        )
                    logger.error(f"Failed to generate text-to-speech audio: {error_message}")
                    raise HTTPException(
                        status_code=response.status,
                        detail={
                            "error": "failed_to_generate_audio",
                            "message": f"Failed to generate text-to-speech audio: {error_message}",
                            "voice_id": voice.value,
                            "is_custom": is_custom
                        }
                    )
    except Exception as e:
        logger.error(f"Failed to generate text-to-speech audio with Eleven Labs: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_server_error",
                "message": f"Failed to generate text-to-speech audio: {str(e)}",
                "voice_id": voice.value,
                "is_custom": is_custom
            }
        )

if __name__ == "__main__":
    # Example usage of the elevenlabs_text_to_speech function
    import asyncio
    from models import ElevenLabsVoiceIdentifier

    async def main():
        script = "Hello, this is a test script for text-to-speech conversion."
        voice = ElevenLabsVoiceIdentifier("gtVylSAXuNzydSb0uL4b")
        is_custom = True
        output_file_path = "audio.mp3"
        
        try:
            result = await elevenlabs_text_to_speech(script, voice, is_custom, output_file_path)
            print(f"Audio file generated at: {result}")
        except HTTPException as e:
            print(f"An error occurred: {e.detail}")

    asyncio.run(main())
