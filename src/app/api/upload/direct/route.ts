import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename") || `upload-${Date.now()}.mp4`;
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();

    const bytes = await req.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const targetFilePath = path.join(uploadsDir, sanitizedName);
    await fs.writeFile(targetFilePath, buffer);

    const publicUrl = `/uploads/${sanitizedName}`;
    console.log(`[Direct Upload PUT] Saved file to ${targetFilePath} -> ${publicUrl}`);

    return NextResponse.json({
      success: true,
      publicUrl,
      key: `uploads/${sanitizedName}`,
      size: buffer.length,
    });
  } catch (error) {
    console.error("[Direct Upload PUT Error]:", error);
    return NextResponse.json(
      { error: "Failed to upload file locally", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
    }

    const sanitizedName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase()}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const targetFilePath = path.join(uploadsDir, sanitizedName);
    await fs.writeFile(targetFilePath, buffer);

    const publicUrl = `/uploads/${sanitizedName}`;
    console.log(`[Direct Upload POST] Saved file to ${targetFilePath} -> ${publicUrl}`);

    return NextResponse.json({
      success: true,
      publicUrl,
      key: `uploads/${sanitizedName}`,
      size: buffer.length,
    });
  } catch (error) {
    console.error("[Direct Upload POST Error]:", error);
    return NextResponse.json(
      { error: "Failed to upload file locally", message: (error as Error).message },
      { status: 500 }
    );
  }
}
