import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const falKey = process.env.FAL_KEY || "";
  const openAiKey = process.env.OPENAI_API_KEY || "";
  const falModel = process.env.FAL_MODEL || "fal-ai/kling-video/v3/standard/motion-control";

  const hasFalKey =
    falKey.length > 5 && falKey !== "your_fal_ai_key" && !falKey.includes("your_");
  const hasOpenAiKey =
    openAiKey.length > 5 &&
    openAiKey !== "sk-proj-your-openai-api-key" &&
    !openAiKey.includes("your-");

  const maskedFalKey = hasFalKey
    ? `${falKey.slice(0, 4)}...${falKey.slice(-4)}`
    : "";

  return NextResponse.json({
    engine: "PersonaMotion Neural Studio Pro",
    engineVersion: "v3.5 Ultra",
    freeModeActive: true,
    unlimitedGenerations: true,
    hasFalKey,
    hasOpenAiKey,
    falModel,
    maskedFalKey,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { falKey, falModel, openAiKey } = body;

    // 1. Update runtime environment variables immediately
    if (typeof falKey === "string" && falKey.trim().length > 0) {
      process.env.FAL_KEY = falKey.trim();
    }
    if (typeof falModel === "string" && falModel.trim().length > 0) {
      process.env.FAL_MODEL = falModel.trim();
    }
    if (typeof openAiKey === "string" && openAiKey.trim().length > 0) {
      process.env.OPENAI_API_KEY = openAiKey.trim();
    }

    // 2. Persist to .env file in project root
    try {
      const envPath = path.join(process.cwd(), ".env");
      let envContent = "";
      try {
        envContent = await fs.readFile(envPath, "utf-8");
      } catch {
        // file might not exist, read from .env.example
        const examplePath = path.join(process.cwd(), ".env.example");
        envContent = await fs.readFile(examplePath, "utf-8");
      }

      if (falKey) {
        if (envContent.includes("FAL_KEY=")) {
          envContent = envContent.replace(/FAL_KEY="?[^"\r\n]*"?/, `FAL_KEY="${falKey.trim()}"`);
        } else {
          envContent += `\nFAL_KEY="${falKey.trim()}"\n`;
        }
      }

      if (falModel) {
        if (envContent.includes("FAL_MODEL=")) {
          envContent = envContent.replace(/FAL_MODEL="?[^"\r\n]*"?/, `FAL_MODEL="${falModel.trim()}"`);
        } else {
          envContent += `\nFAL_MODEL="${falModel.trim()}"\n`;
        }
      }

      if (openAiKey) {
        if (envContent.includes("OPENAI_API_KEY=")) {
          envContent = envContent.replace(
            /OPENAI_API_KEY="?[^"\r\n]*"?/,
            `OPENAI_API_KEY="${openAiKey.trim()}"`
          );
        } else {
          envContent += `\nOPENAI_API_KEY="${openAiKey.trim()}"\n`;
        }
      }

      await fs.writeFile(envPath, envContent, "utf-8");
      console.log("[Settings API] Persisted keys to .env successfully.");
    } catch (fsErr) {
      console.warn("[Settings API Warning] Could not persist to .env file:", fsErr);
    }

    // 3. Test Fal.ai key if provided
    let falKeyValid = true;
    let falKeyTestMessage = "Key saved successfully.";

    if (falKey && falKey.trim().length > 5) {
      try {
        const testRes = await fetch("https://rest.alpha.fal.ai/keys/current", {
          headers: { Authorization: `Key ${falKey.trim()}` },
        });
        if (testRes.ok) {
          falKeyValid = true;
          falKeyTestMessage = "Fal.ai API key verified and active!";
        } else if (testRes.status === 401 || testRes.status === 403) {
          falKeyValid = false;
          falKeyTestMessage = "Key was saved, but Fal.ai returned 401 Unauthorized. Please double-check your key format.";
        }
      } catch {
        // Network timeout / skip verification
      }
    }

    return NextResponse.json({
      success: true,
      message: falKeyTestMessage,
      falKeyValid,
      hasFalKey: true,
    });
  } catch (error) {
    console.error("[Settings API Error]:", error);
    return NextResponse.json(
      { error: "Failed to update settings", message: (error as Error).message },
      { status: 500 }
    );
  }
}
