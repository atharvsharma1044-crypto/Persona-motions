import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

const requestSchema = z.object({
  storyPrompt: z.string().min(3, "Story script must be at least 3 characters"),
  characterContext: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  targetShotCount: z.number().int().min(1).max(12).default(4),
  stylePreset: z
    .enum(["cinematic", "anime", "photorealistic", "hyperlapse", "noir", "fantasy", "scifi"])
    .default("cinematic"),
});

const decomposedShotSchema = z.object({
  sequenceOrder: z.number().int(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  cameraMovement: z.enum([
    "Static Medium Shot",
    "Push In Close-Up",
    "Orbit Left",
    "Orbit Right",
    "Crane Down",
    "Tracking Shot Following Subject",
    "Wide Dutch Angle",
    "Slow Zoom Out",
  ]),
  durationSeconds: z.number().min(2).max(10),
  characterState: z.string(),
  lightingAndAtmosphere: z.string(),
  soundCue: z.string().optional(),
});

const decomposeResultSchema = z.object({
  title: z.string(),
  narrativeSummary: z.string(),
  detectedCharacter: z.string().optional(),
  shots: z.array(decomposedShotSchema),
  estimatedTotalDurationSeconds: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = requestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { storyPrompt, characterContext, targetShotCount, stylePreset } =
      validated.data;

    // 1. Check if user provided an external OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && apiKey !== "sk-proj-your-openai-api-key" && !apiKey.includes("your-openai")) {
      try {
        const openai = new OpenAI({ apiKey });

        const systemPrompt = `You are an elite cinematic director and AI video prompt engineer specializing in video diffusion models (Wan 2.1, CogVideoX, Sora).
Your job is to break down the user's screenplay or story script into a sequence of ${targetShotCount} distinct, character-consistent video storyboard shots.

Guidelines:
1. Maintain strict character visual consistency across every shot. Character: ${
          characterContext?.name || "Protagonist"
        } ${
          characterContext?.description
            ? `(${characterContext.description})`
            : ""
        }.
2. Visual style preset: ${stylePreset}.
3. Visual prompts must describe physical motion, camera angle, atmospheric lighting, and high-fidelity textures.
4. Camera movement must strictly be one of:
   - "Static Medium Shot"
   - "Push In Close-Up"
   - "Orbit Left"
   - "Orbit Right"
   - "Crane Down"
   - "Tracking Shot Following Subject"
   - "Wide Dutch Angle"
   - "Slow Zoom Out"
5. Durations should range between 3.0 and 6.0 seconds per shot.
6. Return valid JSON matching the exact schema requested.`;

        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Story script to decompose into ${targetShotCount} shots: "${storyPrompt}"`,
            },
          ],
          temperature: 0.7,
        });

        const rawContent = completion.choices[0]?.message?.content;
        if (rawContent) {
          const parsedJson = JSON.parse(rawContent);
          const validatedOutput = decomposeResultSchema.safeParse(parsedJson);
          if (validatedOutput.success) {
            return NextResponse.json(validatedOutput.data);
          }
        }
      } catch (llmErr) {
        console.warn("[LLM Decompose Notice - Switching to Intelligent Offline Engine]:", llmErr);
      }
    }

    // 2. Intelligent Offline Script Breakdown Engine (Zero-cost, instant, handles screenplays & prose)
    const scriptAnalysis = analyzeScriptAndExtractShots(
      storyPrompt,
      characterContext?.name,
      characterContext?.description,
      targetShotCount,
      stylePreset
    );

    return NextResponse.json(scriptAnalysis);
  } catch (error) {
    console.error("[Story Decompose API Error]:", error);
    return NextResponse.json(
      {
        error: "Failed to decompose story",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * Intelligent Script Analysis & Shot Breakdown Engine
 * Parses screenplay headings, character dialogue, action beats, and environmental cues.
 */
function analyzeScriptAndExtractShots(
  rawScript: string,
  providedCharName?: string,
  providedCharDesc?: string,
  targetCount: number = 4,
  style: string = "cinematic"
) {
  const cleanScript = rawScript.trim();

  // Step 1: Detect Character Name from Script if not explicitly provided
  let detectedName = providedCharName?.trim() || "";
  if (!detectedName || detectedName.toLowerCase() === "the subject" || detectedName.toLowerCase() === "protagonist") {
    const blacklistWords = new Set(["THE", "A", "AN", "IN", "ON", "AT", "WHEN", "AFTER", "SCENE", "EXT", "INT", "ACT", "CUT", "FADE", "SHOT", "AND", "WITH"]);
    
    // Check for uppercase character names (e.g. KAI, ELENA, MAVUIKA, REN)
    const allCapsWords = cleanScript.match(/\b[A-Z]{3,15}\b/g) || [];
    const validCapName = allCapsWords.find((w) => !blacklistWords.has(w.toUpperCase()));

    // Check dialogue or colon match: e.g. KAI: "..."
    const dialogueMatch = cleanScript.match(/\b([A-Za-z][a-zA-Z0-9_]{2,15}):/);
    const nameMatch = cleanScript.match(/(?:named|character|warrior|hero|agent|pilot|hacker|cat|samurai)\s+([A-Z][a-zA-Z]+)/i);

    if (validCapName) {
      detectedName = validCapName.charAt(0).toUpperCase() + validCapName.slice(1).toLowerCase();
    } else if (dialogueMatch && !blacklistWords.has(dialogueMatch[1].toUpperCase())) {
      detectedName = dialogueMatch[1];
    } else if (nameMatch && !blacklistWords.has(nameMatch[1].toUpperCase())) {
      detectedName = nameMatch[1];
    } else if (cleanScript.toLowerCase().includes("cat") || cleanScript.toLowerCase().includes("shorthair")) {
      detectedName = "Anthropomorphic Cat";
    } else if (cleanScript.toLowerCase().includes("samurai")) {
      detectedName = "Cyber Samurai";
    } else if (cleanScript.toLowerCase().includes("spider-man") || cleanScript.toLowerCase().includes("spiderman")) {
      detectedName = "Spider-Man";
    } else if (cleanScript.toLowerCase().includes("iron man") || cleanScript.toLowerCase().includes("ironman")) {
      detectedName = "Iron Man";
    } else if (cleanScript.toLowerCase().includes("dragon")) {
      detectedName = "Mecha Dragon";
    } else {
      detectedName = "Protagonist";
    }
  }

  // Step 2: Extract Wardrobe, Props, & Aesthetic Keynotes
  let wardrobePropNotes = providedCharDesc || "";
  if (!wardrobePropNotes || wardrobePropNotes === "consistent character look") {
    const props: string[] = [];
    if (/jacket|leather|suit|coat|armor|hoodie|cape|trenchcoat/i.test(cleanScript)) {
      const match = cleanScript.match(/\b(?:wearing\s+)?([a-z\s]+(?:jacket|suit|coat|armor|hoodie|cape|trenchcoat))/i);
      if (match) props.push(match[1].trim());
    }
    if (/card|cards|uno/i.test(cleanScript)) props.push("holding a playing card clearly in hand");
    if (/katana|sword|blade/i.test(cleanScript)) props.push("wielding a sleek katana");
    if (/gun|pistol|blaster|rifle/i.test(cleanScript)) props.push("carrying tactical weaponry");
    if (/boots|gloves|visor|glasses|helmet/i.test(cleanScript)) props.push("wearing specialized tactical gear");

    wardrobePropNotes = props.length > 0 ? props.join(", ") : "photorealistic bespoke wardrobe";
  }

  // Step 3: Parse Script into Discrete Narrative Beats (handling screenplay scenes, linebreaks, and punctuation)
  const lines = cleanScript
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Group script lines into meaningful narrative beats
  let rawBeats: string[] = [];
  if (lines.length >= targetCount) {
    rawBeats = lines;
  } else {
    // Split by sentences if fewer lines
    rawBeats = cleanScript
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter((s) => s.length > 5);
  }

  if (rawBeats.length === 0) {
    rawBeats = [cleanScript];
  }

  // Camera choreographies mapped to dramatic story progression
  const cameraMotions: Array<
    | "Static Medium Shot"
    | "Push In Close-Up"
    | "Orbit Left"
    | "Orbit Right"
    | "Crane Down"
    | "Tracking Shot Following Subject"
    | "Wide Dutch Angle"
    | "Slow Zoom Out"
  > = [
    "Wide Dutch Angle",               // Shot 1: Establishing environment
    "Tracking Shot Following Subject",// Shot 2: Character in motion
    "Push In Close-Up",               // Shot 3: Facial emotion / prop detail
    "Orbit Left",                     // Shot 4: Dramatic tension
    "Crane Down",                     // Shot 5: High-angle dynamic view
    "Orbit Right",                    // Shot 6: Climax beat
    "Static Medium Shot",             // Shot 7: Hero resolution
    "Slow Zoom Out",                  // Shot 8: Cinematic finale
  ];

  // Lighting & atmosphere inference
  let baseLighting = "Volumetric rim lighting with soft golden hour ambient fill";
  let baseSound = "Cinematic atmospheric synth pad with subtle foley footsteps";

  if (/neon|rain|puddle|night|cyber|spire/i.test(cleanScript)) {
    baseLighting = "Anamorphic cyan and magenta neon reflections on wet asphalt with volumetric mist";
    baseSound = "Rain on concrete, distant sirens, low sub-bass drone and electrical hum";
  } else if (/desert|highway|sunset|dusk|dust|sun/i.test(cleanScript)) {
    baseLighting = "Warm golden hour sunlight cutting through atmospheric dust haze with high-contrast rim rays";
    baseSound = "Desert wind gusts, highway asphalt rumble, distant mechanical idle";
  } else if (/fire|flame|explosion|blast|smoke/i.test(cleanScript)) {
    baseLighting = "High-intensity orange firelight flicker with deep volumetric smoke shadows";
    baseSound = "Impact riser, roaring flame foley, percussion sub-drop";
  } else if (style === "noir") {
    baseLighting = "High contrast black and white chiaroscuro shadows with single spotlight key";
    baseSound = "Melancholy trumpet swell, footsteps echoing on wet cobblestone";
  } else if (style === "anime") {
    baseLighting = "Vibrant Makoto Shinkai celestial cloud glow with sparkling light prisms";
    baseSound = "Lush orchestral strings with delicate chime glissandos";
  }

  // Format style prefix cleanly without duplicate words
  const stylePrefix =
    style === "anime"
      ? "Anime Makoto Shinkai style 8k"
      : style === "noir"
      ? "Dark cinematic film noir 35mm"
      : style === "photorealistic"
      ? "Hyper-realistic 8k IMAX footage"
      : style === "fantasy"
      ? "Epic high-fantasy cinematic 8k"
      : style === "scifi"
      ? "Futuristic sci-fi cinematic anamorphic"
      : "Cinematic 35mm anamorphic footage";

  const shots = [];
  let totalDuration = 0;

  for (let i = 0; i < targetCount; i++) {
    const beatIndex = Math.min(i, rawBeats.length - 1);
    const beatText = rawBeats[beatIndex] || `Scene progression for ${detectedName}`;
    const cleanBeat = beatText.replace(/^scene\s*\d+[:.-]?\s*/i, "").replace(/^(ext|int)\.?\s*[^.-]+[-–]\s*/i, "");

    const duration = 4.0;
    totalDuration += duration;
    const camera = cameraMotions[i % cameraMotions.length];

    // Character emotional and kinematic state per beat
    let characterState = `Scene ${i + 1}: ${detectedName} maintaining visual consistency and physical momentum`;
    if (i === 0) characterState = `Establishing presence, observing scene environment with acute focus`;
    else if (i === 1) characterState = `Engaged in active kinetic movement, physical interaction with scene`;
    else if (i === 2) characterState = `Intense close-up expression, decisive gesture or prop interaction`;
    else characterState = `Dynamic action climax, resolving motion beat into dramatic finish`;

    // Construct high-fidelity visual diffusion prompt
    const visualPrompt = `${stylePrefix} of ${detectedName} (${wardrobePropNotes}). ${cleanBeat}. ${baseLighting}, shallow depth of field, 24fps motion cadence, photorealistic fine textures.`;

    shots.push({
      sequenceOrder: i + 1,
      prompt: visualPrompt,
      negativePrompt:
        "blurry, morphing artifacts, extra limbs, distorted hands, bad anatomy, low resolution, warped props, cartoonish, watermark",
      cameraMovement: camera,
      durationSeconds: duration,
      characterState,
      lightingAndAtmosphere: baseLighting,
      soundCue: `${baseSound} (Beat #${i + 1})`,
    });
  }

  return {
    title: `Story Sequence: ${detectedName}`,
    detectedCharacter: detectedName,
    narrativeSummary: `A ${style} structured ${targetCount}-shot visual sequence based on: "${cleanScript.slice(0, 100)}..."`,
    shots,
    estimatedTotalDurationSeconds: totalDuration,
  };
}
