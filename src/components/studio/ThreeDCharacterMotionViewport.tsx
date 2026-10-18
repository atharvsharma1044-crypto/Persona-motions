"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import {
  RotateCcw,
  Camera,
  Maximize2,
  Video,
  Play,
  Pause,
  Compass,
  Sparkles,
  Flame,
  Layers,
  Download,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ThreeDCharacterMotionViewportProps {
  characterName: string;
  avatarUrl: string;
  accentColor?: string;
  secondaryColor?: string;
  motionType?: "orbit_combat" | "depth_flight" | "acrobatic_swing" | "ground_sprint" | "dramatic_float";
  isGenerating?: boolean;
  onVideoCaptured?: (blob: Blob, url: string) => void;
}

export function ThreeDCharacterMotionViewport({
  characterName,
  avatarUrl,
  accentColor = "#a855f7",
  secondaryColor = "#06b6d4",
  motionType = "orbit_combat",
  isGenerating = false,
  onVideoCaptured,
}: ThreeDCharacterMotionViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport & Camera state
  const [cameraMode, setCameraMode] = useState<"orbit" | "hero_low" | "close_up" | "free">("orbit");
  const [isPlaying3D, setIsPlaying3D] = useState<boolean>(true);
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [particleDensity, setParticleDensity] = useState<number>(300);

  // References to Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterMeshRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Mouse interaction state for free camera drag
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraRotationRef = useRef<{ yaw: number; pitch: number; distance: number }>({
    yaw: 0,
    pitch: 0.2,
    distance: 4.5,
  });

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.FogExp2(0x09090b, 0.08);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 4.5);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Dynamic Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimColor = new THREE.Color(accentColor);
    const rimLight = new THREE.DirectionalLight(rimColor, 2.8);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(new THREE.Color(secondaryColor), 2.5, 10);
    pointLight.position.set(0, 1, 2);
    scene.add(pointLight);

    // 5. 3D Grid Floor
    const gridHelper = new THREE.GridHelper(20, 20, new THREE.Color(accentColor).getHex(), 0x27272a);
    gridHelper.position.y = -1.2;
    scene.add(gridHelper);

    // 6. 3D Character Mesh Billboard with Depth Material
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";

    const proxySafeUrl = avatarUrl.startsWith("http")
      ? `/api/media/proxy?url=${encodeURIComponent(avatarUrl)}`
      : avatarUrl;

    textureLoader.load(
      proxySafeUrl,
      (texture) => {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;

        const aspect = texture.image.width / texture.image.height;
        const geomHeight = 2.4;
        const geomWidth = geomHeight * aspect;

        const geometry = new THREE.PlaneGeometry(geomWidth, geomHeight, 32, 32);
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          roughness: 0.4,
          metalness: 0.2,
        });

        const characterMesh = new THREE.Mesh(geometry, material);
        characterMesh.position.set(0, 0, 0);
        characterMesh.castShadow = true;
        scene.add(characterMesh);
        characterMeshRef.current = characterMesh;
      },
      undefined,
      (err) => {
        console.warn("Could not load character texture, using procedural avatar geometry:", err);
        // Procedural 3D humanoid avatar fallback
        const geom = new THREE.CylinderGeometry(0.3, 0.5, 2.0, 16);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(accentColor),
          roughness: 0.3,
          metalness: 0.8,
        });
        const mesh = new THREE.Mesh(geom, mat);
        scene.add(mesh);
        characterMeshRef.current = mesh;
      }
    );

    // 7. Volumetric 3D Particles
    const particleCount = particleDensity;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const c1 = new THREE.Color(accentColor);
    const c2 = new THREE.Color(secondaryColor);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 8;
      positions[i + 1] = Math.random() * 5 - 1.2;
      positions[i + 2] = (Math.random() - 0.5) * 8;

      const mixFactor = Math.random();
      const col = c1.clone().lerp(c2, mixFactor);
      colors[i] = col.r;
      colors[i + 1] = col.g;
      colors[i + 2] = col.b;
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    // 8. Animation & Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Animate Character in 3D Space
      if (characterMeshRef.current) {
        const mesh = characterMeshRef.current;

        if (motionType === "orbit_combat") {
          // Dynamic combat martial arts bobbing and rotational stance
          mesh.position.y = Math.sin(elapsedTime * 3) * 0.12;
          mesh.rotation.y = Math.sin(elapsedTime * 1.5) * 0.25;
          mesh.rotation.z = Math.sin(elapsedTime * 2.5) * 0.06;
        } else if (motionType === "depth_flight") {
          // 3D forward/backward hovering & flight swooping
          mesh.position.y = 0.4 + Math.sin(elapsedTime * 2) * 0.28;
          mesh.position.z = Math.sin(elapsedTime * 1.8) * 0.35;
          mesh.rotation.x = Math.sin(elapsedTime * 2) * 0.15;
          mesh.rotation.y = Math.cos(elapsedTime * 1.5) * 0.2;
        } else if (motionType === "acrobatic_swing") {
          // Dynamic pendulum swing & acrobatic roll
          mesh.position.x = Math.sin(elapsedTime * 2) * 0.6;
          mesh.position.y = Math.cos(elapsedTime * 4) * 0.2;
          mesh.rotation.z = Math.sin(elapsedTime * 2) * 0.3;
        } else if (motionType === "ground_sprint") {
          // Rapid ground cadence
          mesh.position.y = Math.abs(Math.sin(elapsedTime * 6)) * 0.18;
          mesh.position.x = Math.sin(elapsedTime * 3) * 0.2;
        } else {
          // Weightless cosmic float
          mesh.position.y = Math.sin(elapsedTime * 1.2) * 0.2;
          mesh.rotation.y = elapsedTime * 0.2;
        }
      }

      // Animate 3D Particles
      if (particlesRef.current) {
        const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const array = posAttr.array as Float32Array;

        for (let i = 1; i < array.length; i += 3) {
          array[i] += 0.008;
          if (array[i] > 4) array[i] = -1.2;
        }
        posAttr.needsUpdate = true;
        particlesRef.current.rotation.y = elapsedTime * 0.05;
      }

      // 3D Camera Controls & Motion
      if (cameraRef.current) {
        const cam = cameraRef.current;

        if (cameraMode === "orbit") {
          const orbitRadius = 4.2;
          const orbitSpeed = 0.55;
          cam.position.x = Math.sin(elapsedTime * orbitSpeed) * orbitRadius;
          cam.position.z = Math.cos(elapsedTime * orbitSpeed) * orbitRadius;
          cam.position.y = 1.2 + Math.sin(elapsedTime * 0.8) * 0.4;
          cam.lookAt(0, 0.2, 0);
        } else if (cameraMode === "hero_low") {
          cam.position.set(0.5, -0.6, 3.2);
          cam.lookAt(0, 0.8, 0);
        } else if (cameraMode === "close_up") {
          cam.position.set(0, 0.5, 2.0);
          cam.lookAt(0, 0.6, 0);
        } else {
          // Free manual mouse orbit
          const { yaw, pitch, distance } = cameraRotationRef.current;
          cam.position.x = distance * Math.sin(yaw) * Math.cos(pitch);
          cam.position.y = distance * Math.sin(pitch) + 0.3;
          cam.position.z = distance * Math.cos(yaw) * Math.cos(pitch);
          cam.lookAt(0, 0.2, 0);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [avatarUrl, accentColor, secondaryColor, motionType, cameraMode, particleDensity]);

  // Handle Free Mouse Drag to Orbit 3D Camera
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    setCameraMode("free");
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    cameraRotationRef.current.yaw -= deltaX * 0.008;
    cameraRotationRef.current.pitch = Math.max(
      -Math.PI / 4,
      Math.min(Math.PI / 3, cameraRotationRef.current.pitch + deltaY * 0.008)
    );

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Wheel zoom in 3D
  const handleWheel = (e: React.WheelEvent) => {
    cameraRotationRef.current.distance = Math.max(
      1.5,
      Math.min(8.0, cameraRotationRef.current.distance + e.deltaY * 0.005)
    );
  };

  // Record 3D WebGL Motion Stream to Video
  const handleRecord3DVideo = () => {
    if (!canvasRef.current) return;

    if (isRecordingVideo) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecordingVideo(false);
      return;
    }

    try {
      const stream = canvasRef.current.captureStream(60);
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
        videoBitsPerSecond: 8000000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(videoUrl);
        if (onVideoCaptured) {
          onVideoCaptured(blob, videoUrl);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVideo(true);

      // Auto-stop after 8 seconds of continuous 3D motion recording
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
          setIsRecordingVideo(false);
        }
      }, 8000);
    } catch (err) {
      console.error("3D Video capture error:", err);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col">
      {/* Top Status Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Badge variant="purple" className="text-[11px] font-mono uppercase backdrop-blur-md bg-violet-950/80 border-violet-700/50">
            <Compass className="w-3.5 h-3.5 mr-1 text-violet-400 animate-spin" style={{ animationDuration: "8s" }} />
            3D Spatial Viewport
          </Badge>
          <span className="text-xs font-semibold text-zinc-200 bg-black/60 px-2.5 py-1 rounded-md border border-zinc-800 backdrop-blur-sm">
            {characterName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Camera View Mode Presets */}
          <div className="bg-black/70 backdrop-blur-md border border-zinc-800 rounded-lg p-1 flex gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setCameraMode("orbit")}
              className={`px-2 py-1 rounded transition ${
                cameraMode === "orbit"
                  ? "bg-violet-600 text-white font-medium shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              360° Orbit
            </button>
            <button
              type="button"
              onClick={() => setCameraMode("hero_low")}
              className={`px-2 py-1 rounded transition ${
                cameraMode === "hero_low"
                  ? "bg-violet-600 text-white font-medium shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Hero Low-Angle
            </button>
            <button
              type="button"
              onClick={() => setCameraMode("close_up")}
              className={`px-2 py-1 rounded transition ${
                cameraMode === "close_up"
                  ? "bg-violet-600 text-white font-medium shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Close-Up
            </button>
          </div>

          {/* Record 3D Video Button */}
          <Button
            size="sm"
            variant={isRecordingVideo ? "destructive" : "gradient"}
            onClick={handleRecord3DVideo}
            className="text-xs font-semibold shadow-lg shadow-violet-900/40"
          >
            {isRecordingVideo ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-ping mr-1.5" />
                Recording 3D (60fps)...
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5 mr-1.5" />
                Capture 3D Video
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="relative w-full aspect-video min-h-[460px] max-h-[640px] cursor-grab active:cursor-grabbing select-none"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Ambient Overlay Hint */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-violet-400" />
          <span>Click & drag to rotate 3D camera • Scroll to zoom</span>
        </div>

        {/* Motion Dynamics Indicator */}
        <div className="absolute bottom-3 right-3 z-10 pointer-events-none bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800/80 text-[11px] text-zinc-300 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="uppercase">3D Kinematics: {motionType.replace("_", " ")}</span>
        </div>
      </div>
    </div>
  );
}
