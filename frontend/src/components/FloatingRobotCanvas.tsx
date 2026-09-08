'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

export function FloatingRobotCanvas({
  onClick,
  isOpen,
  className,
}: {
  onClick?: () => void;
  isOpen?: boolean;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const modelGroupRef = useRef<any>(null);
  const spinStateRef = useRef({
    active: false,
    startTime: 0,
    startRot: 0,
    targetRot: 0,
  });

  // Whenever isOpen toggles, trigger a 360 spin in Three.js
  useEffect(() => {
    if (modelGroupRef.current) {
      const currentRot = modelGroupRef.current.rotation.y;
      spinStateRef.current = {
        active: true,
        startTime: performance.now(),
        startRot: currentRot,
        targetRot: currentRot + Math.PI * 2 * (isOpen ? 1 : -1),
      };
    }
  }, [isOpen]);

  useEffect(() => {
    let isDisposed = false;
    let renderer: any = null;
    let scene: any = null;
    let camera: any = null;
    let mixer: any = null;
    let clock: any = null;
    let modelGroup: any = null;
    let reqId: number;

    async function initThree() {
      try {
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

        if (isDisposed || !mountRef.current) return;

        const container = mountRef.current;
        const width = 128;
        const height = 128;

        // Scene
        scene = new THREE.Scene();

        // Camera - centered on robot
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 3.4);
        camera.lookAt(0, 0, 0);

        // WebGL Renderer
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.35;
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.pointerEvents = 'none';

        container.appendChild(renderer.domElement);

        // Pure neutral white studio lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
        keyLight.position.set(2, 3, 3);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 1.6);
        fillLight.position.set(-2, -1, 2);
        scene.add(fillLight);

        // Radiant Blue Accent Lights giving Celene a stand-out ethereal blue hue
        const blueRimLight = new THREE.PointLight(0x4fa3d1, 3.8, 10);
        blueRimLight.position.set(0, 1.5, 2.2);
        scene.add(blueRimLight);

        const blueBackLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
        blueBackLight.position.set(-2, -1, -2);
        scene.add(blueBackLight);

        let lastTime = performance.now();
        const startTime = performance.now();

        // Load GLTF Model
        const loader = new GLTFLoader();
        loader.load(
          '/models/robot/scene.gltf',
          (gltf) => {
            if (isDisposed) return;

            const robotScene = gltf.scene;

            // Hide the wide horizontal projection waves under the robot
            robotScene.traverse((child: any) => {
              if (child.name && child.name.toLowerCase().includes('wave')) {
                child.visible = false;
              }
            });

            // Update world matrix to calculate exact bounding box of the robot body
            robotScene.updateMatrixWorld(true);
            const box = new THREE.Box3();
            robotScene.traverse((child: any) => {
              if (child.isMesh && child.visible && !child.name.toLowerCase().includes('wave')) {
                box.expandByObject(child);
              }
            });

            if (box.isEmpty()) {
              box.setFromObject(robotScene);
            }

            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            // Center robot inside a pivot group
            robotScene.position.set(-center.x, -center.y, -center.z);

            const pivotGroup = new THREE.Group();
            pivotGroup.add(robotScene);

            // Scale to prominently fill view without clipping
            const targetSize = 2.15;
            const scale = targetSize / (maxDim || 1);
            pivotGroup.scale.set(scale, scale, scale);
            pivotGroup.position.set(0, 0, 0);

            scene.add(pivotGroup);
            modelGroup = pivotGroup;
            modelGroupRef.current = pivotGroup;

            // Handle animations if present in GLTF
            if (gltf.animations && gltf.animations.length > 0) {
              mixer = new THREE.AnimationMixer(robotScene);
              gltf.animations.forEach((clip) => {
                mixer.clipAction(clip).play();
              });
            }

            setIsLoaded(true);
          },
          undefined,
          (err) => {
            console.warn('GLTF loading error, falling back to stylistic avatar', err);
            setLoadError(true);
          }
        );

        // Render loop
        const animate = () => {
          reqId = requestAnimationFrame(animate);
          const now = performance.now();
          const delta = Math.min((now - lastTime) / 1000, 0.1);
          const time = (now - startTime) / 1000;
          lastTime = now;

          if (mixer) mixer.update(delta);

          if (modelGroup) {
            // Organic floating hover bob
            const hoverY = Math.sin(time * 2.6) * 0.04;
            modelGroup.position.y = hoverY;

            // Playful 360 Spin Transition
            if (spinStateRef.current.active) {
              const elapsed = (performance.now() - spinStateRef.current.startTime) / 700;
              if (elapsed < 1) {
                // Smooth spring-like ease with a tiny playful overshoot
                const p = elapsed;
                const ease = 1 - Math.pow(1 - p, 3);
                modelGroup.rotation.y =
                  spinStateRef.current.startRot +
                  (spinStateRef.current.targetRot - spinStateRef.current.startRot) * ease;
              } else {
                modelGroup.rotation.y = spinStateRef.current.targetRot;
                spinStateRef.current.active = false;
              }
            }
          }

          if (renderer && scene && camera) {
            renderer.render(scene, camera);
          }
        };

        animate();
      } catch (e) {
        console.warn('Three.js failed to initialize', e);
        setLoadError(true);
      }
    }

    initThree();

    return () => {
      isDisposed = true;
      if (reqId) cancelAnimationFrame(reqId);
      if (renderer && renderer.domElement) {
        renderer.domElement.remove();
        renderer.dispose();
      }
    };
  }, []);

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer select-none group flex items-center justify-center active:scale-95 transition-transform ${
        className || 'w-28 h-28 sm:w-32 sm:h-32'
      }`}
      title={isOpen ? 'Celene Heritage Concierge' : 'Consult Celene AI Concierge'}
    >
      {/* Luminous Celestial Blue Hue Aura */}
      <div className="absolute w-24 h-24 rounded-full bg-[#38bdf8]/40 blur-xl pointer-events-none z-0 animate-pulse" />
      <div className="absolute w-16 h-16 rounded-full bg-[#8B7355]/35 blur-md pointer-events-none z-0" />

      {/* 3D WebGL Canvas mount with transparent background, depth shadow, and blue glow */}
      <div
        ref={mountRef}
        className={`relative z-10 w-full h-full flex items-center justify-center pointer-events-none transition-opacity duration-500 filter drop-shadow-[0_0_20px_rgba(56,189,248,0.55)] drop-shadow-[0_12px_24px_rgba(29,78,86,0.3)] ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Stylistic Editorial Fallback Avatar (No AI-slop emoji) */}
      {(!isLoaded || loadError) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1D4E56] to-[#347F8C] border border-white/40 flex items-center justify-center text-white shadow-xl">
            <Sparkles className="w-6 h-6 text-[#F5F1E6]" />
          </div>
          <span className="text-[9px] font-mono text-[#1D4E56] uppercase tracking-[0.2em] font-bold mt-1.5">
            Celene
          </span>
        </div>
      )}

      {/* Hover tooltip when closed */}
      {!isOpen && (
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-[#1C4D56] text-[#F5F1E6] font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none border border-white/15 flex items-center gap-1.5 translate-x-1 group-hover:translate-x-0">
          <span>Ask Celene</span>
          <span className="text-[#A69B80] font-bold">&rarr;</span>
        </div>
      )}
    </div>
  );
}
