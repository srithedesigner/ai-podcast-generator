import base64
import os
from fastapi import FastAPI, HTTPException, Body
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import requests
import uvicorn
from eleven_labs import elevenlabs_text_to_speech
from models import ElevenLabsVoiceIdentifier
from services import generate_image_from_prompt, llm_service
import json
import fal_client

load_dotenv()
from upload_to_s3 import upload_file_to_s3

app = FastAPI(title="Posecast")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)


def generate_character_image(description: str) -> str:
    try:
        result = generate_image_from_prompt(description)
        print(result["images"][0], "result")
        if "url" in result["images"][0]:
            return result["images"][0]['url']
        else:
            raise Exception("No image URL found in result.")
    except Exception as e:
        raise Exception(f"Error generating character image: {str(e)}")

@app.post("/generate-character/")
async def generate_character(payload = Body(...)):
    try:
        character_description = payload.get("character_description", "")
        if not character_description:
            raise HTTPException(status_code=400, detail="Please provide a character description.")

        image_url = generate_character_image(character_description)
        print(image_url, "image_url")
        return {"image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating character: {str(e)}")




@app.post("/generate-script/")
async def generate_script(payload = Body(...)):
    if True:
        
        print(payload, "payload")

        charecters = payload.get("characters", "[]")
        podcast_description = payload.get("podcast_description", "")
        
        if not podcast_description or len(charecters) != 2:
            raise HTTPException(status_code=400, detail="Please provide exactly 2 characters and a podcast description.")
        
        # Create detailed prompt
        prompt = f"""
You are a comedy scriptwriter tasked with generating a short, funny podcast dialogue between two fictional characters.

## Instructions:
You will receive:
- Two character profiles (name + description)
- A podcast episode context or theme

Your job is to write a humorous, snappy, back-and-forth dialogue between the two characters.

### Dialogue Rules:
- Each line must be under 10 seconds long when spoken (≈ 20 words max).
- The dialogue should alternate between the two characters — no monologues.
- Each line must reflect the speaker's distinct personality and voice.
- The tone should be funny, clever, sarcastic, or satirical.
- Dialogue must feel natural, quick-paced, and character-driven.

## Character Profiles:
Character 1: {charecters[0]["name"]}
Character 2: {charecters[1]["name"]}

## Character Descriptions:
Character 1: {charecters[0]["description"]}
Character 2: {charecters[1]["description"]}

## Podcast Context:
{podcast_description}

## Output Format (JSON):
Return only a JSON object with this structure:

{{
  "dialogues": [
    {{
      "character": 1,
      "text": "Line of dialogue from character 1"
    }},
    {{
      "character": 2,
      "text": "Line of dialogue from character 2"
    }}
    // Continue for 8-10 total lines
  ]
}}
        """

        # Call LLM service
        result = llm_service(prompt)

        print(result, "result")

        # Parse the JSON response
        try:
            script_data = json.loads(result)
            print(script_data, "script_data")
            return script_data
        except json.JSONDecodeError:
            return {
                "error": "Failed to parse response from LLM as JSON",
                "response": result
            }

    # except Exception as e:
    #     raise HTTPException(status_code=500, detail=f"Error generating script: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Welcome to the Character Generator API"}

fal_api_key = os.getenv("FAL_KEY")

def on_queue_update(update):
    if isinstance(update, fal_client.InProgress):
        for log in update.logs:
            print(log["message"])

def call_fal_api(image_url: str, studio_image_url: str, prompt: str, aspect_ratio: str) -> dict:
    """
    Calls the external API to generate an image based on the provided parameters.

    Args:
        image_url: The URL of the uploaded image.
        studio_image_url: The URL of the hardcoded studio image.
        prompt: The prompt describing the desired image transformation.
        aspect_ratio: The desired aspect ratio for the generated image.

    Returns:
        A dictionary containing the generated images and the prompt used, or an error message.
    """
    result = fal_client.subscribe(
        "fal-ai/flux-pro/kontext/multi",
        arguments={
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "image_urls": [image_url, studio_image_url]
        },
        with_logs=True,
        on_queue_update=on_queue_update,
    )

    if result:
        return {
            "images": result.get("images", []),
            "prompt": prompt
        }
    else:
        return {"error": "Failed to generate image"}




# Define the prompt and aspect ratio
prompt = "Replace the person in the image to seated in the same position at the podcast table. Keep the red chair, wooden desk, folded hands posture, Add black over-ear headphones, and the microphone setup on the left. Replace studio background with beige soundproof panels and a softbox light in the corner. Use the same camera angle and lighting — a waist-up, eye-level shot with a warm, professional podcast vibe."
aspect_ratio = "9:16"
# Hardcoded studio image URL
studio_image_url = "https://test-bucket-aws-mine.s3.ap-south-1.amazonaws.com/studio.jpg.png"

@app.post("/generate_uploaded_character")
async def generate_uploaded_character(image_base64: str):
    # Convert base64 image to blob and save as jpg
    image_data = base64.b64decode(image_base64)
    with open("temp_image.jpg", "wb") as f:
        f.write(image_data)

    # Upload to S3 and get URL
    image_url = upload_file_to_s3("temp_image.jpg", "temp_image.jpg")


    # Call the modular API function
    final_image_url =  call_fal_api(image_url, studio_image_url, prompt, aspect_ratio)
    print(final_image_url, "final_image_url")
    return final_image_url


@app.post("/dia_to_wav")
async def dia_to_wav(payload = Body(...)):
    try:
        script = payload.get("dialgue", "")
        if not script:
            raise HTTPException(status_code=400, detail="Please provide a script for text-to-speech conversion.")

        # Use the ElevenLabsVoiceIdentifier.WILL for the voice
        voice = ElevenLabsVoiceIdentifier.WILL

        # Define the output file path
        output_file_path = "output_audio.wav"

        # Call the Eleven Labs text-to-speech function
        audio_file_path = await elevenlabs_text_to_speech(script, voice, output_file_path=output_file_path)

        # Upload the audio file to S3 and get the URL
        audio_url = upload_file_to_s3(audio_file_path, "output_audio.wav")

        return {"audio_url": audio_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating audio: {str(e)}")
    
@app.post("/generate_video")
async def generate_video(payload = Body(...)):
    try:
        image_url = payload.get("image_url", "")
        audio_url = payload.get("audio_url", "")
        
        if not image_url or not audio_url:
            raise HTTPException(status_code=400, detail="Please provide both image and audio URLs.")

        # Call the modular function to generate video
        video_url = await call_modular_video_function(image_url, audio_url)

        return {"video_url": video_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating video: {str(e)}")

async def call_modular_video_function(image_url: str, audio_url: str) -> str:
    handler = await fal_client.submit_async(
        "fal-ai/hunyuan-avatar",
        arguments={
            "audio_url": audio_url,
            "image_url": image_url
        }
    )

    async for event in handler.iter_events(with_logs=True):
        print(event)

    result = await handler.get()
    return result["output_url"]


# if __name__ == "__main__":
#     image_url = "https://test-bucket-aws-mine.s3.ap-south-1.amazonaws.com/ayush_thumbnail_blue_white.webp"
#     # Call the fal API function
#     final_image_url = call_fal_api(image_url, studio_image_url, prompt, aspect_ratio)
#     print(final_image_url, "final_image_url")




if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
