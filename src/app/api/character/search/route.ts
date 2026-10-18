import { NextRequest, NextResponse } from "next/server";
import { analyzePromptCharacter } from "@/lib/character_intelligence";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = (body.prompt as string) || "";

    if (!prompt.trim()) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    const result = analyzePromptCharacter(prompt);

    return NextResponse.json({
      success: true,
      originalPrompt: prompt,
      character: result,
    });
  } catch (error) {
    console.error("[Character Search API Error]:", error);
    return NextResponse.json(
      { error: "Failed to analyze character from prompt", message: (error as Error).message },
      { status: 500 }
    );
  }
}
