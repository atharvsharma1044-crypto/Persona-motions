import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface MotionClip {
  id: string;
  title: string;
  description: string;
  category: "action" | "dance" | "talking" | "cinematic" | "sports" | "drama" | "sci-fi";
  tags: string[];
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  recommendedPrompt: string;
  motionType: string;
}

const MOTION_LIBRARY: MotionClip[] = [
  {
    id: "motion-locomotion-cinematic",
    title: "Cinematic Movement & Locomotion",
    description: "Dynamic human locomotion with expressive arm choreography and body tracking.",
    category: "action",
    tags: ["action", "movement", "locomotion", "walking", "run", "fast", "choreography", "cinematic", "dynamic", "hero", "parkour"],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80",
    duration: 10,
    recommendedPrompt: "Dynamic cinematic character in high-speed motion, expressive natural body locomotion, dramatic camera perspective.",
    motionType: "Full Body Locomotion",
  },
  {
    id: "motion-acting-gestures",
    title: "Sci-Fi Actor Expressions & Gestures",
    description: "Nuanced upper-body dynamic acting, head turning, intense facial focus, and hand gestures.",
    category: "sci-fi",
    tags: ["acting", "expression", "face", "talking", "sci-fi", "cyberpunk", "drama", "gesture", "look", "close-up", "soldier"],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    duration: 12,
    recommendedPrompt: "Futuristic cinematic actor performing dramatic facial expressions, head turn, and hand gestures with moody scene lighting.",
    motionType: "Facial & Upper Body Acting",
  },
  {
    id: "motion-street-dance",
    title: "Urban Street Dance & Rhythm",
    description: "Fast-paced hip-hop dance moves, fluid arm transitions, and energetic head rhythm.",
    category: "dance",
    tags: ["dance", "dancing", "hip hop", "street", "breakdance", "rhythm", "music", "groove", "freestyle", "energetic"],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=600&q=80",
    duration: 15,
    recommendedPrompt: "Energetic street dance choreography, fluid rhythm transitions, natural cloth physics, vibrant urban stage backdrop.",
    motionType: "Dance Choreography",
  },
  {
    id: "motion-talking-head",
    title: "Keynote Speech & Talking Head",
    description: "Clear frontal speaker presentation with natural head tilts, eye contact, and lip articulation.",
    category: "talking",
    tags: ["talking", "speech", "speaker", "presentation", "interview", "conversation", "anchor", "news", "portrait", "dialogue"],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80",
    duration: 8,
    recommendedPrompt: "Professional talking head presentation, clean lighting, clear facial expressions, natural articulation and eye gaze.",
    motionType: "Talking Head / Dialogue",
  },
  {
    id: "motion-dynamic-outdoor",
    title: "Outdoor Exploration & Adventure",
    description: "Wide terrain movement, atmospheric environmental lighting, and dynamic camera panning.",
    category: "cinematic",
    tags: ["outdoor", "adventure", "explore", "nature", "journey", "camera pan", "wide angle", "road", "travel", "environment"],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
    duration: 10,
    recommendedPrompt: "Cinematic outdoor adventure sequence, wide panoramic environment, realistic environmental illumination and camera motion.",
    motionType: "Wide Cinematic Pan",
  },
  {
    id: "motion-martial-arts",
    title: "Martial Arts Stance & Strike",
    description: "Precision martial arts striking posture, fast hand maneuvers, and balanced defensive stances.",
    category: "sports",
    tags: ["martial arts", "kung fu", "karate", "ninja", "samurai", "fight", "strike", "kick", "boxing", "action", "sword", "combat"],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=600&q=80",
    duration: 9,
    recommendedPrompt: "High-precision martial arts combat stance and strike choreography, intense gaze, athletic physical agility, 4K film crispness.",
    motionType: "Martial Arts Combat",
  },
];

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const category = req.nextUrl.searchParams.get("category");

  if (!query.trim() && !category) {
    return NextResponse.json({
      query: "",
      total: MOTION_LIBRARY.length,
      results: MOTION_LIBRARY,
    });
  }

  const queryTerms = query
    .toLowerCase()
    .split(/[\s,+-]+/)
    .filter((t) => t.length > 1);

  // Score clips based on term overlap
  const scored = MOTION_LIBRARY.map((clip) => {
    let score = 0;
    const searchableText = `${clip.title} ${clip.description} ${clip.category} ${clip.tags.join(" ")} ${clip.motionType}`.toLowerCase();

    for (const term of queryTerms) {
      if (searchableText.includes(term)) {
        score += 10;
        // Boost exact tag match
        if (clip.tags.includes(term)) score += 15;
        // Boost category match
        if (clip.category === term) score += 20;
      }
    }

    if (category && clip.category === category.toLowerCase()) {
      score += 25;
    }

    return { clip, score };
  });

  // Sort by highest score first, fallback to all if zero matches
  scored.sort((a, b) => b.score - a.score);

  const matchedClips =
    scored.some((s) => s.score > 0)
      ? scored.filter((s) => s.score > 0).map((s) => s.clip)
      : MOTION_LIBRARY;

  return NextResponse.json({
    query,
    category: category || null,
    total: matchedClips.length,
    results: matchedClips,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = (body.prompt as string) || "";

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Empty prompt provided" }, { status: 400 });
    }

    // Extract key action verbs and nouns from prompt
    const cleanedPrompt = prompt.toLowerCase();
    const detectedTags: string[] = [];

    const keywords = [
      "dance", "dancing", "fight", "fighting", "samurai", "ninja", "martial arts",
      "walk", "run", "running", "sprint", "jump", "talk", "talking", "speech",
      "interview", "laugh", "sing", "superhero", "action", "cinematic", "cyberpunk",
      "anime", "noir", "sports", "kick", "boxing", "gesture", "car", "travel"
    ];

    for (const kw of keywords) {
      if (cleanedPrompt.includes(kw)) {
        detectedTags.push(kw);
      }
    }

    // Rank matching clips
    const scored = MOTION_LIBRARY.map((clip) => {
      let score = 0;
      const haystack = `${clip.title} ${clip.description} ${clip.tags.join(" ")}`.toLowerCase();

      for (const tag of detectedTags) {
        if (haystack.includes(tag)) score += 20;
      }

      // Check full string match
      const words = cleanedPrompt.split(/\s+/);
      for (const w of words) {
        if (w.length > 2 && haystack.includes(w)) score += 5;
      }

      return { clip, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topClip = (scored[0] && scored[0].score > 0) ? scored[0].clip : MOTION_LIBRARY[0];

    // Generate prompt adaptation matching "just like original video were made"
    const synthesizedPrompt = `${topClip.recommendedPrompt} Stylistic adaptation: ${prompt.trim()}. Seamless character replacement matching exact original lighting, motion cadence, and scene depth.`;

    return NextResponse.json({
      success: true,
      originalPrompt: prompt,
      detectedTags,
      matchedClip: topClip,
      synthesizedPrompt,
      allMatches: scored.map((s) => s.clip),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process prompt search", message: (error as Error).message },
      { status: 500 }
    );
  }
}
