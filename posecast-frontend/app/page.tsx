"use client"

import { useState, ChangeEvent } from "react"
import { Upload, Wand2, Play, FileText, Mic, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Character = {
  id: 1 | 2
  type: "upload" | "description" | null
  image?: string
  description?: string
  isGenerating?: boolean
  generated?: boolean
  file?: File  // Add file property to store the selected file
}

type ScriptState = {
  type: "upload" | "generate" | null
  content?: string
  context?: string
  isGenerating?: boolean
  generated?: boolean
}

export default function PoseCast() {
  const [characters, setCharacters] = useState<Character[]>([
    { id: 1, type: null },
    { id: 2, type: null },
  ])
  const [script, setScript] = useState<ScriptState>({ type: null })
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoGenerated, setVideoGenerated] = useState(false)

  const updateCharacter = (id: 1 | 2, updates: Partial<Character>) => {
    setCharacters((prev) => prev.map((char) => (char.id === id ? { ...char, ...updates } : char)))
  }

  const generateCharacter = async (id: 1 | 2) => {
    updateCharacter(id, { isGenerating: true })
    try {
      const response = await fetch('http://127.0.0.1:8000/generate-character/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        character_description: characters.find(char => char.id === id)?.description || '',
      }),
      });
      
      if (!response.ok) throw new Error('Failed to generate character');
      
      const data = await response.json();
      console.log(data);
      updateCharacter(id, {
      isGenerating: false,
      generated: true,
      image: data.image_url || `/placeholder.svg?height=300&width=240&text=Character+${id}`,
      });
    } catch (error) {
      console.error('Error generating character:', error);
      updateCharacter(id, { 
      isGenerating: false,
      generated: true,
      image: `/placeholder.svg?height=300&width=240&text=Character+${id}`,
      });
    }
    }

const generateScript = async () => {
  setScript((prev) => ({ ...prev, isGenerating: true }));
  try {
    const characterData = characters.map(char => ({
      name: `Character ${char.id}`,
      description: char.description || `Character ${char.id}`
    }));

    console.log("Sending data:", {
      characters: characterData,
      podcast_description: script.context || 'A podcast conversation',
    });

    const response = await fetch('http://127.0.0.1:8000/generate-script/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        characters: characterData,
        podcast_description: script.context || 'A podcast conversation',
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to generate script:', errorText);
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Received data:", data);
    
    setScript((prev) => ({
      ...prev,
      isGenerating: false,
      generated: true,
      content: data.script || 'Failed to generate script content.',
    }));
  } catch (error) {
    console.error('Error generating script:', error);
    setScript((prev) => ({
      ...prev,
      isGenerating: false,
      generated: true,
      content: `HOST 1: Welcome to today's episode! I'm excited to discuss this fascinating topic.\n\nHOST 2: This is going to be an incredible conversation. Let me start by sharing some insights...`,
    }));
  }
}
    const generateVideo = async () => {
    setIsGeneratingVideo(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/generate-video/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        characters: characters.map(char => ({
        id: char.id,
        image: char.image,
        description: char.description
        })),
        script: script.content
      }),
      });
      
      if (!response.ok) throw new Error('Failed to generate video');
      
      const data = await response.json();
      setIsGeneratingVideo(false);
      setVideoGenerated(true);
    } catch (error) {
      console.error('Error generating video:', error);
      setIsGeneratingVideo(false);
      setVideoGenerated(true);
    }
    }

  const canGenerateVideo =
    characters.every((char) => char.generated || char.image) && (script.generated || script.content)

  const resetCharacter = (id: 1 | 2) => {
    updateCharacter(id, {
      type: null,
      generated: false,
      image: undefined,
      description: undefined,
    })
  }

  // Add a file input handler
  const handleFileChange = (id: 1 | 2, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateCharacter(id, { file });
    }
  };

  // Add function to handle file upload to API
  const uploadCharacterImage = async (id: 1 | 2) => {
    const character = characters.find(char => char.id === id);
    if (!character?.file) return;

    updateCharacter(id, { isGenerating: true });
    
    try {
      // Create form data to send the file
      const formData = new FormData();
      formData.append('image', character.file);
      
      const response = await fetch('http://127.0.0.1:8000/generate_uploaded_charecter/', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        console.log('Failed to process uploaded character');
      }

      
      const data = await response.json();
      console.log('Upload response:', data);
      
      updateCharacter(id, {
        isGenerating: false,
        generated: true,
        image: data.image_url || `/placeholder.svg?height=300&width=240&text=Character+${id}`,
      });
    } catch (error) {
      console.error('Error uploading character image:', error);
      updateCharacter(id, { 
        isGenerating: false,
        generated: true,
        image: `/placeholder.svg?height=300&width=240&text=Character+${id}`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-purple-50">
      <div className="px-6 py-12 w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
            <span className="relative">
              <span className="line-through text-gray-900">Pod</span>
              <span className="text-gray-400">PoseCast</span>
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create AI-powered podcasts with fictional characters
          </p>
        </div>

        <div className="space-y-16 max-w-[1400px] mx-auto">
          {/* Characters Section */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Characters</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {characters.map((character) => (
                <Card
                  key={character.id}
                  className={`border shadow-sm hover:shadow-md transition-all duration-300 ${
                    character.generated
                      ? "border-green-300 bg-gradient-to-br from-white to-green-50"
                      : "hover:border-purple-200"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Character {character.id}</h3>
                      {character.generated && (
                        <Button
                          onClick={() => resetCharacter(character.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {!character.type && !character.generated && (
                      <div className="space-y-4">
                        <p className="text-gray-600 text-sm mb-4">How would you like to create this character?</p>
                        <Button
                          onClick={() => updateCharacter(character.id, { type: "upload" })}
                          variant="outline"
                          className="w-full h-12 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200"
                        >
                          <Upload className="w-4 h-4 mr-2 text-purple-600" />
                          <span className="text-gray-800">Upload Image</span>
                        </Button>
                        <Button
                          onClick={() => updateCharacter(character.id, { type: "description" })}
                          variant="outline"
                          className="w-full h-12 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-blue-200"
                        >
                          <Wand2 className="w-4 h-4 mr-2 text-blue-600" />
                          <span className="text-gray-800">Generate from Description</span>
                        </Button>
                      </div>
                    )}

                    {character.type === "upload" && !character.generated && (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-purple-200 rounded-lg p-8 text-center bg-purple-50/50 hover:bg-purple-50 transition-colors">
                          <Input 
                            type="file" 
                            accept="image/*" 
                            className="mb-3" 
                            onChange={(e) => handleFileChange(character.id, e)}
                          />
                          <p className="text-sm text-gray-500">Upload character image</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => uploadCharacterImage(character.id)}
                            disabled={!character.file || character.isGenerating}
                            className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                          >
                            {character.isGenerating ? (
                              <>
                                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Processing...
                              </>
                            ) : (
                              "Upload & Process"
                            )}
                          </Button>
                          <Button
                            onClick={() => updateCharacter(character.id, { type: null })}
                            variant="outline"
                            className="border-gray-300"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {character.type === "description" && !character.generated && (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block text-gray-700">
                            Describe your character
                          </Label>
                          <Textarea
                            placeholder="A wise old wizard with a long white beard..."
                            rows={3}
                            className="bg-white/80 border-blue-200 focus:border-blue-400"
                            value={character.description || ""}
                            onChange={(e) => updateCharacter(character.id, { description: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => generateCharacter(character.id)}
                            disabled={!character.description || character.isGenerating}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                          >
                            {character.isGenerating ? (
                              <>
                                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Generating...
                              </>
                            ) : (
                              "Generate"
                            )}
                          </Button>
                          <Button
                            onClick={() => updateCharacter(character.id, { type: null })}
                            variant="outline"
                            className="border-gray-300"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {character.generated && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                          <Check className="w-5 h-5" />
                          <span className="font-medium">Character Ready</span>
                        </div>
                        <div className="bg-white p-2 border border-gray-200 rounded-md shadow-sm">
                          <img
                            src={character.image || "/placeholder.svg"}
                            alt={`Character ${character.id}`}
                            className="w-full h-auto object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Script Section */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Script</h2>
            </div>

            <Card
              className={`border shadow-sm ${script.generated ? "border-green-300 bg-gradient-to-br from-white to-green-50" : "hover:border-blue-200"}`}
            >
              <CardContent className="p-6">
                {!script.type && !script.generated && (
                  <div>
                    <p className="text-gray-600 text-sm mb-6">How would you like to create your podcast script?</p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <Button
                        onClick={() => setScript({ type: "upload" })}
                        variant="outline"
                        className="h-24 flex-col gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200"
                      >
                        <Upload className="w-6 h-6 text-blue-600" />
                        <span className="text-gray-800">Upload Script</span>
                      </Button>
                      <Button
                        onClick={() => setScript({ type: "generate" })}
                        variant="outline"
                        className="h-24 flex-col gap-2 bg-gradient-to-r from-cyan-50 to-teal-50 hover:from-cyan-100 hover:to-teal-100 border-cyan-200"
                      >
                        <Wand2 className="w-6 h-6 text-cyan-600" />
                        <span className="text-gray-800">Generate Script</span>
                      </Button>
                    </div>
                  </div>
                )}

                {script.type === "upload" && !script.generated && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block text-gray-700">Paste your script</Label>
                      <Textarea
                        placeholder="Paste your podcast script here..."
                        rows={8}
                        className="bg-white/80 border-blue-200 focus:border-blue-400"
                        value={script.content || ""}
                        onChange={(e) => setScript((prev) => ({ ...prev, content: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setScript((prev) => ({ ...prev, generated: true }))}
                        disabled={!script.content}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                      >
                        Confirm Script
                      </Button>
                      <Button onClick={() => setScript({ type: null })} variant="outline" className="border-gray-300">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {script.type === "generate" && !script.generated && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block text-gray-700">
                        What should your podcast be about?
                      </Label>
                      <Textarea
                        placeholder="A discussion about the future of AI technology..."
                        rows={6}
                        className="bg-white/80 border-cyan-200 focus:border-cyan-400"
                        value={script.context || ""}
                        onChange={(e) => setScript((prev) => ({ ...prev, context: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={generateScript}
                        disabled={!script.context || script.isGenerating}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
                      >
                        {script.isGenerating ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Generating...
                          </>
                        ) : (
                          "Generate Script"
                        )}
                      </Button>
                      <Button onClick={() => setScript({ type: null })} variant="outline" className="border-gray-300">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {script.generated && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Script Ready</span>
                      </div>
                      <Button
                        onClick={() => setScript({ type: null })}
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      {(() => {
                        try {
                          // Try to parse the script if it's in JSON format
                          const scriptData = typeof script.content === 'string' && script.content.trim().startsWith('{') 
                            ? JSON.parse(script.content)
                            : null;
                          
                          if (scriptData && scriptData.dialogues && Array.isArray(scriptData.dialogues)) {
                            return (
                              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                {scriptData.dialogues.map((dialogue, index) => (
                                  <div 
                                    key={index} 
                                    className={`p-4 ${dialogue.character === 1 ? 'bg-blue-50' : 'bg-purple-50'}`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div 
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                                          dialogue.character === 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-purple-500 to-indigo-500'
                                        }`}
                                      >
                                        C{dialogue.character}
                                      </div>
                                      <div className="flex-1">
                                        <p className={`text-sm font-semibold mb-1 ${
                                          dialogue.character === 1 ? 'text-blue-700' : 'text-purple-700'
                                        }`}>
                                          Character {dialogue.character}
                                        </p>
                                        <p className="text-gray-700">{dialogue.text}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          
                          // Fallback to the regular text display
                          return (
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap p-6 max-h-96 overflow-y-auto">
                              {script.content}
                            </pre>
                          );
                        } catch (error) {
                          // If parsing fails, show as plain text
                          return (
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap p-6 max-h-96 overflow-y-auto">
                              {script.content}
                            </pre>
                          );
                        }
                      })()}
                    </div>
                  </div>
                )}
                              </CardContent>
                            </Card>
                          </section>

          {/* Generate Video Section */}
          {canGenerateVideo && (
            <section>
              <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 shadow-md">
                <CardContent className="p-8 text-center">
                  {!isGeneratingVideo && !videoGenerated && (
                    <div className="space-y-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                        <Play className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Ready to Generate</h3>
                        <p className="text-gray-600">Your characters and script are ready for podcast creation!</p>
                      </div>
                      <Button
                        onClick={generateVideo}
                        size="lg"
                        className="px-10 py-6 text-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-md"
                      >
                        Generate Podcast Video
                      </Button>
                    </div>
                  )}

                  {isGeneratingVideo && (
                    <div className="space-y-8 py-4">
                      <div className="relative w-24 h-24 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 border-r-blue-600 border-b-cyan-600 border-l-indigo-600 animate-spin"></div>
                        <div className="absolute inset-3 rounded-full border-4 border-t-transparent border-r-transparent border-b-purple-400 border-l-blue-400 animate-spin animate-reverse"></div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-3">Generating Your Podcast</h3>
                        <p className="text-gray-600">Creating something amazing just for you...</p>
                      </div>
                      <div className="max-w-md mx-auto bg-white/70 rounded-lg p-4 backdrop-blur-sm">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                            <p className="text-gray-700 text-sm">Processing characters...</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <p className="text-gray-700 text-sm">Analyzing script...</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                            <p className="text-gray-700 text-sm">Generating audio...</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                            <p className="text-gray-700 text-sm">Creating video...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {videoGenerated && (
                    <div className="space-y-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                        <Check className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900">Your Podcast is Ready!</h3>
                      <div className="bg-black rounded-lg p-2 aspect-video max-w-3xl mx-auto shadow-xl">
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                          <Play className="w-16 h-16 text-white opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 justify-center">
                        <Button className="px-8 py-6 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                          <Play className="w-5 h-5 mr-2" />
                          Play Video
                        </Button>
                        <Button
                          variant="outline"
                          className="px-8 py-6 border-purple-300 bg-white/80 hover:bg-white text-gray-800"
                        >
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          className="px-8 py-6 border-blue-300 bg-white/80 hover:bg-white text-gray-800"
                        >
                          Share
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
