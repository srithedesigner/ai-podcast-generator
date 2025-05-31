from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from services import generate_image_from_prompt, llm_service
import json

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
