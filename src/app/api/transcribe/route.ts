import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthSession } from "@/lib/auth";

// POST /api/transcribe
// Body: FormData with field "audio" (audio/webm or audio/mp4 blob)
// Returns: { transcript: string }
export async function POST(req: NextRequest) {
  // Skip auth in development so voice input can be tested without login
  if (process.env.NODE_ENV !== "development") {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const formData = await req.formData();
  const audioBlob = formData.get("audio") as Blob | null;
  if (!audioBlob) {
    return NextResponse.json({ error: "Missing audio" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Whisper needs a File object with a filename — browser Blobs don't have one
  const audioFile = new File([audioBlob], "recording.webm", { type: audioBlob.type });

  // No language specified — Whisper auto-detects Chinese, English, mixed, etc.
  const response = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
  });

  return NextResponse.json({ transcript: response.text });
}
