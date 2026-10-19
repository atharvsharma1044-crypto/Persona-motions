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
  Activity,
  Zap,
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
  drivingVideoTime?: number;
  isDrivingVideoPlaying?: boolean;
  drivingVideoDuration?: number;
  onVideoCaptured?: (blob: Blob, url: string) => void;
}

export function ThreeDCharacterMotionViewport({
  characterName,
  avatarUrl,
  accentColor = "#a855f7",
  secondaryColor = "#06b6d4",
  motionType = "orbit_combat",
  isGenerating = false,
  drivingVideoTime = 0,
  isDrivingVideoPlaying = false,
  drivingVideoDuration = 8.5,
  onVideoCaptured,
}: ThreeDCharacterMotionViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport & Camera state
  const [cameraMode, setCameraMode] = useState<"choreography" | "orbit" | "hero_low" | "close_up" | "free">("choreography");
  const [isPlaying3D, setIsPlaying3D] = useState<boolean>(true);
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [activeMotionPreset, setActiveMotionPreset] = useState(motionType);

  useEffect(() => {
    setActiveMotionPreset(motionType);
  }, [motionType]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Articulated Character Rig References
  const characterRootRef = useRef<THREE.Group | null>(null);
  const headGroupRef = useRef<THREE.Group | null>(null);
  const torsoMeshRef = useRef<THREE.Mesh | null>(null);
  const leftArmRef = useRef<THREE.Group | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const leftLegRef = useRef<THREE.Group | null>(null);
  const rightLegRef = useRef<THREE.Group | null>(null);
  const shadowMeshRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);

  // Sync state refs
  const videoTimeRef = useRef<number>(drivingVideoTime);
  const isVideoPlayingRef = useRef<boolean>(isDrivingVideoPlaying);

  useEffect(() => {
    videoTimeRef.current = drivingVideoTime;
  }, [drivingVideoTime]);

  useEffect(() => {
    isVideoPlayingRef.current = isDrivingVideoPlaying;
  }, [isDrivingVideoPlaying]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Mouse interaction state for free camera drag
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraRotationRef = useRef<{ yaw: number; pitch: number; distance: number }>({
    yaw: 0,
    pitch: 0.2,
    distance: 4.8,
  });

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.FogExp2(0x09090b, 0.07);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 4.8);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimColor = new THREE.Color(accentColor);
    const rimLight = new THREE.DirectionalLight(rimColor, 3.2);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(new THREE.Color(secondaryColor), 2.8, 12);
    pointLight.position.set(0, 1.2, 2.2);
    scene.add(pointLight);

    // 5. 3D Grid Floor
    const gridHelper = new THREE.GridHelper(24, 24, new THREE.Color(accentColor).getHex(), 0x27272a);
    gridHelper.position.y = -1.3;
    scene.add(gridHelper);

    // 6. BUILD ARTICULATED 3D HUMANOID CHARACTER RIG
    const characterRoot = new THREE.Group();
    scene.add(characterRoot);
    characterRootRef.current = characterRoot;

    const accentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      roughness: 0.35,
      metalness: 0.7,
    });

    const secondaryMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondaryColor),
      roughness: 0.25,
      metalness: 0.85,
    });

    const darkArmorMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.45,
      metalness: 0.6,
    });

    // 6A. Torso & Chestplate
    const torsoGeom = new THREE.CylinderGeometry(0.38, 0.28, 0.85, 16);
    const torsoMesh = new THREE.Mesh(torsoGeom, accentMat);
    torsoMesh.position.y = 0.45;
    torsoMesh.castShadow = true;
    characterRoot.add(torsoMesh);
    torsoMeshRef.current = torsoMesh;

    // Chest Arc Reactor / Emblem
    const emblemGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
    emblemGeom.rotateX(Math.PI / 2);
    const emblemMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(secondaryColor),
    });
    const emblemMesh = new THREE.Mesh(emblemGeom, emblemMat);
    emblemMesh.position.set(0, 0.6, 0.32);
    characterRoot.add(emblemMesh);

    // 6B. Head Group (Face Portrait Billboard + 3D Cowl / Helmet)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.15, 0);
    characterRoot.add(headGroup);
    headGroupRef.current = headGroup;

    // 3D Helmet / Back-head sphere
    const helmetGeom = new THREE.SphereGeometry(0.36, 24, 24);
    const helmetMesh = new THREE.Mesh(helmetGeom, darkArmorMat);
    helmetMesh.position.set(0, 0, -0.05);
    headGroup.add(helmetMesh);

    // Texture Face Plane
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

        const img = texture.image as HTMLImageElement | undefined;
        const imgW = img?.naturalWidth || img?.width || 512;
        const imgH = img?.naturalHeight || img?.height || 512;
        const aspect = imgW / imgH;

        if (aspect < 0.75) {
          // Full-body character standing figure
          const fullH = 2.4;
          const fullW = fullH * aspect;
          const charGeom = new THREE.PlaneGeometry(fullW, fullH, 16, 16);
          const charMat = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            roughness: 0.35,
            metalness: 0.1,
          });
          const charPlane = new THREE.Mesh(charGeom, charMat);
          charPlane.position.set(0, 0.1, 0.32);
          charPlane.castShadow = true;
          characterRoot.add(charPlane);
        } else {
          const faceGeom = new THREE.PlaneGeometry(0.68, 0.82, 16, 16);
          const faceMat = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.FrontSide,
            roughness: 0.4,
            metalness: 0.2,
          });

          const facePlane = new THREE.Mesh(faceGeom, faceMat);
          facePlane.position.set(0, 0, 0.24);
          facePlane.castShadow = true;
          headGroup.add(facePlane);
        }
      },
      undefined,
      () => {
        // Fallback procedural face visor
        const visorGeom = new THREE.BoxGeometry(0.48, 0.24, 0.1);
        const visorMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(secondaryColor),
          roughness: 0.1,
          metalness: 0.9,
        });
        const visor = new THREE.Mesh(visorGeom, visorMat);
        visor.position.set(0, 0, 0.28);
        headGroup.add(visor);
      }
    );

    // 6C. Left & Right Articulated Arms
    const createArm = (isLeft: boolean) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(isLeft ? -0.52 : 0.52, 0.75, 0);

      // Shoulder pauldron
      const pauldronGeom = new THREE.SphereGeometry(0.18, 12, 12);
      const pauldron = new THREE.Mesh(pauldronGeom, secondaryMat);
      armGroup.add(pauldron);

      // Upper arm
      const upperArmGeom = new THREE.CylinderGeometry(0.1, 0.08, 0.42, 12);
      upperArmGeom.translate(0, -0.21, 0);
      const upperArm = new THREE.Mesh(upperArmGeom, accentMat);
      armGroup.add(upperArm);

      // Forearm & Hand
      const forearmGeom = new THREE.CylinderGeometry(0.08, 0.07, 0.38, 12);
      forearmGeom.translate(0, -0.48, 0.08);
      const forearm = new THREE.Mesh(forearmGeom, darkArmorMat);
      armGroup.add(forearm);

      return armGroup;
    };

    const leftArm = createArm(true);
    const rightArm = createArm(false);
    characterRoot.add(leftArm);
    characterRoot.add(rightArm);
    leftArmRef.current = leftArm;
    rightArmRef.current = rightArm;

    // 6D. Left & Right Kinetic Legs
    const createLeg = (isLeft: boolean) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(isLeft ? -0.22 : 0.22, 0.02, 0);

      // Thigh
      const thighGeom = new THREE.CylinderGeometry(0.12, 0.1, 0.55, 12);
      thighGeom.translate(0, -0.27, 0);
      const thigh = new THREE.Mesh(thighGeom, darkArmorMat);
      legGroup.add(thigh);

      // Shin & Boot
      const shinGeom = new THREE.CylinderGeometry(0.1, 0.12, 0.58, 12);
      shinGeom.translate(0, -0.76, 0.04);
      const shin = new THREE.Mesh(shinGeom, accentMat);
      legGroup.add(shin);

      return legGroup;
    };

    const leftLeg = createLeg(true);
    const rightLeg = createLeg(false);
    characterRoot.add(leftLeg);
    characterRoot.add(rightLeg);
    leftLegRef.current = leftLeg;
    rightLegRef.current = rightLeg;

    // 6E. Ground Contact Shadow
    const shadowGeom = new THREE.CircleGeometry(0.75, 24);
    shadowGeom.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.65,
    });
    const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    shadowMesh.position.y = -1.28;
    scene.add(shadowMesh);
    shadowMeshRef.current = shadowMesh;

    // 7. Volumetric 3D Energy Particles
    const particleCount = 280;
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
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    // 8. Animation & Video Synchronization Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Determine active synchronized time:
      // When driving video is playing or provided, lock time to driving video!
      let syncTime = videoTimeRef.current;
      if (!isVideoPlayingRef.current && syncTime === 0) {
        syncTime = clock.getElapsedTime();
      } else if (isVideoPlayingRef.current) {
        // Advance clock smoothly with video cadence
        syncTime = videoTimeRef.current + clock.getDelta();
      }

      // Synchronize 3D Articulated Character Kinematics with Video Cadence
      if (characterRootRef.current) {
        const root = characterRootRef.current;
        const currentMotion = activeMotionPreset;

        if (currentMotion === "orbit_combat") {
          // Dynamic martial arts stance & combat weight shifting
          root.position.x = Math.sin(syncTime * 2.5) * 0.35;
          root.position.y = -0.1 + Math.sin(syncTime * 5.0) * 0.08;
          root.position.z = Math.cos(syncTime * 2.0) * 0.2;
          root.rotation.y = Math.sin(syncTime * 1.8) * 0.3;

          // Arm strike coordination
          if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(syncTime * 5) * 0.7;
          if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(syncTime * 5) * 0.7;

          // Leg stepping cadence
          if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.sin(syncTime * 5) * 0.35;
          if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(syncTime * 5) * 0.35;
        } else if (currentMotion === "depth_flight") {
          // Thruster flight & 3D forward/backward hovering
          root.position.x = Math.sin(syncTime * 1.6) * 0.45;
          root.position.y = 0.3 + Math.sin(syncTime * 2.4) * 0.25;
          root.position.z = Math.sin(syncTime * 2.0) * 0.55;
          root.rotation.x = 0.25 + Math.sin(syncTime * 2.4) * 0.15;
          root.rotation.y = Math.cos(syncTime * 1.5) * 0.25;

          // Flight streamlined limbs
          if (leftArmRef.current) leftArmRef.current.rotation.x = -0.6 + Math.sin(syncTime * 2) * 0.1;
          if (rightArmRef.current) rightArmRef.current.rotation.x = -0.6 + Math.sin(syncTime * 2) * 0.1;
          if (leftLegRef.current) leftLegRef.current.rotation.x = 0.4;
          if (rightLegRef.current) rightLegRef.current.rotation.x = 0.4;
        } else if (currentMotion === "acrobatic_swing") {
          // Dynamic acrobatic pendulum swing (Spider-Man style)
          root.position.x = Math.sin(syncTime * 2.2) * 0.85;
          root.position.y = 0.2 + Math.cos(syncTime * 4.4) * 0.35;
          root.rotation.z = Math.sin(syncTime * 2.2) * 0.45;
          root.rotation.y = Math.cos(syncTime * 1.8) * 0.3;

          if (leftArmRef.current) leftArmRef.current.rotation.z = -0.8 + Math.sin(syncTime * 2) * 0.3;
          if (rightArmRef.current) rightArmRef.current.rotation.x = 0.8;
          if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(syncTime * 3) * 0.5;
          if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(syncTime * 3) * 0.5;
        } else if (currentMotion === "ground_sprint") {
          // Rapid ground sprint / dash
          root.position.y = -0.15 + Math.abs(Math.sin(syncTime * 7)) * 0.16;
          root.position.x = Math.sin(syncTime * 3.5) * 0.25;
          root.rotation.x = 0.2;

          if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(syncTime * 7) * 0.9;
          if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(syncTime * 7) * 0.9;
          if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.sin(syncTime * 7) * 0.8;
          if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(syncTime * 7) * 0.8;
        } else {
          // Weightless dramatic aura float
          root.position.y = 0.2 + Math.sin(syncTime * 1.4) * 0.22;
          root.rotation.y = syncTime * 0.35;

          if (leftArmRef.current) leftArmRef.current.rotation.z = -0.3 + Math.sin(syncTime * 1.5) * 0.15;
          if (rightArmRef.current) rightArmRef.current.rotation.z = 0.3 - Math.sin(syncTime * 1.5) * 0.15;
        }

        // Head tracking video direction
        if (headGroupRef.current) {
          headGroupRef.current.rotation.y = Math.sin(syncTime * 1.5) * 0.15;
          headGroupRef.current.rotation.x = Math.sin(syncTime * 2.0) * 0.08;
        }

        // Update ground shadow contact
        if (shadowMeshRef.current) {
          shadowMeshRef.current.position.x = root.position.x;
          shadowMeshRef.current.position.z = root.position.z;
          const scale = Math.max(0.4, 1.0 - (root.position.y + 0.15) * 0.4);
          shadowMeshRef.current.scale.set(scale, scale, scale);
        }
      }

      // Animate 3D Particles
      if (particlesRef.current) {
        const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const array = posAttr.array as Float32Array;

        for (let i = 1; i < array.length; i += 3) {
          array[i] += 0.01;
          if (array[i] > 4) array[i] = -1.2;
        }
        posAttr.needsUpdate = true;
        particlesRef.current.rotation.y = syncTime * 0.08;
      }

      // Camera Movement
      if (cameraRef.current) {
        const cam = cameraRef.current;

        if (cameraMode === "choreography") {
          // Dynamically track character's 3D moves with smooth following
          const targetX = (characterRootRef.current?.position.x || 0) * 0.6;
          const targetY = 1.3 + (characterRootRef.current?.position.y || 0) * 0.4;
          cam.position.x += (targetX - cam.position.x) * 0.08;
          cam.position.y += (targetY - cam.position.y) * 0.08;
          cam.position.z = 4.6;
          cam.lookAt(targetX * 0.5, 0.4, 0);
        } else if (cameraMode === "orbit") {
          const orbitRadius = 4.4;
          const orbitSpeed = 0.45;
          cam.position.x = Math.sin(syncTime * orbitSpeed) * orbitRadius;
          cam.position.z = Math.cos(syncTime * orbitSpeed) * orbitRadius;
          cam.position.y = 1.3 + Math.sin(syncTime * 0.7) * 0.35;
          cam.lookAt(0, 0.3, 0);
        } else if (cameraMode === "hero_low") {
          cam.position.set(0.4, -0.6, 3.4);
          cam.lookAt(0, 0.7, 0);
        } else if (cameraMode === "close_up") {
          cam.position.set(0, 0.9, 2.1);
          cam.lookAt(0, 0.9, 0);
        } else {
          // Free manual mouse orbit
          const { yaw, pitch, distance } = cameraRotationRef.current;
          cam.position.x = distance * Math.sin(yaw) * Math.cos(pitch);
          cam.position.y = distance * Math.sin(pitch) + 0.4;
          cam.position.z = distance * Math.cos(yaw) * Math.cos(pitch);
          cam.lookAt(0, 0.4, 0);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

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
  }, [avatarUrl, accentColor, secondaryColor, activeMotionPreset, cameraMode]);

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

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = (s % 60).toFixed(1);
    return `${mins.toString().padStart(2, "0")}:${Number(secs) < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col">
      {/* Top Status & Synchronization Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Badge variant="purple" className="text-[11px] font-mono uppercase backdrop-blur-md bg-violet-950/80 border-violet-700/50">
            <Compass className="w-3.5 h-3.5 mr-1 text-violet-400 animate-spin" style={{ animationDuration: "8s" }} />
            Articulated 3D Character
          </Badge>
          <span className="text-xs font-semibold text-zinc-200 bg-black/70 px-2.5 py-1 rounded-md border border-zinc-800 backdrop-blur-sm">
            {characterName}
          </span>
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-800/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] text-emerald-300 font-mono">
            <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>SYNC: {formatSecs(drivingVideoTime)} / {formatSecs(drivingVideoDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Camera View Mode Presets */}
          <div className="bg-black/70 backdrop-blur-md border border-zinc-800 rounded-lg p-1 flex gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setCameraMode("choreography")}
              className={`px-2 py-1 rounded transition ${
                cameraMode === "choreography"
                  ? "bg-violet-600 text-white font-medium shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Choreography Tracking
            </button>
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
              Hero Low
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
                Recording (60fps)...
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
          <span>Click & drag to orbit • Scroll to zoom • Motion synced to video timecode</span>
        </div>

        {/* Motion Dynamics Indicator */}
        <div className="absolute bottom-3 right-3 z-10 pointer-events-none bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800/80 text-[11px] text-zinc-300 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="uppercase">Kinematics: {activeMotionPreset.replace("_", " ")}</span>
        </div>
      </div>
    </div>
  );
}
