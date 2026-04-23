import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { uploadLimiter } = await import("@/lib/rate-limit");
    if (!uploadLimiter.check(ip, 3)) { // 3 uploads per min
      return NextResponse.json({ error: "Rate limit exceeded. Max 3 uploads per minute." }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    // 1. Validation Logic
    const rawArrayBuffer = await file.arrayBuffer();
    const checkHeaderBuffer = Buffer.from(rawArrayBuffer);
    const uint8 = new Uint8Array(checkHeaderBuffer.slice(0, 4));
    
    // Magic numbers: [ID3, WAVRIFF, OGG, FLAC]
    const isAudioHeader = (
      (uint8[0] === 0x49 && uint8[1] === 0x44 && uint8[2] === 0x33) || // MP3 ID3
      (uint8[0] === 0x52 && uint8[1] === 0x49 && uint8[2] === 0x46 && uint8[3] === 0x46) || // WAV RIFF
      (uint8[0] === 0x4F && uint8[1] === 0x67 && uint8[2] === 0x67 && uint8[3] === 0x53) || // OGG
      (uint8[0] === 0x66 && uint8[1] === 0x4C && uint8[2] === 0x61 && uint8[3] === 0x43)    // FLAC
    );

    if (!isAudioHeader && !file.type.startsWith("audio/")) {
       return NextResponse.json({ error: "Invalid file signature. Not a valid audio file." }, { status: 400 });
    }

    const sessionId = formData.get("sessionId") as string;
    if (!file || !sessionId) {
      return NextResponse.json({ error: "Missing file or sessionId" }, { status: 400 });
    }

    const streamSession = await prisma.streamSession.findUnique({
      where: { id: sessionId },
      select: { allowDirectUploads: true, maxAudioFileSize: true }
    });

    if (!streamSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!streamSession.allowDirectUploads) {
      return NextResponse.json({ error: "Direct uploads are disabled" }, { status: 403 });
    }

    // 2. Enforce size and type limits
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > streamSession.maxAudioFileSize) {
      return NextResponse.json({ 
        error: `File too large (${fileSizeMB.toFixed(1)}MB). Max allowed: ${streamSession.maxAudioFileSize}MB` 
      }, { status: 413 });
    }

    const allowedMimeTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/aac", "audio/x-m4a", "audio/mp4"];
    const allowedExtensions = [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"];
    
    const extension = extname(file.name).toLowerCase();
    if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
      return NextResponse.json({ 
        error: "Invalid file type. Only audio files are allowed." 
      }, { status: 415 });
    }

    // 3. Prepare storage
    const finalBufferToSave = Buffer.from(rawArrayBuffer);
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${nanoid(10)}${extension || ".mp3"}`;
    const filePath = join(uploadDir, fileName);

    // 4. Save file
    await writeFile(filePath, finalBufferToSave);
    console.log(`File saved to ${filePath}`);

    // Return the public URL
    const publicUrl = `/uploads/${fileName}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
