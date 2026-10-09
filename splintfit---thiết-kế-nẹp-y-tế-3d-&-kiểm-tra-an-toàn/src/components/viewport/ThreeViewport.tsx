/**
 * SplintFit - 3D Interactive Viewport (Three.js WebGL CAD Engine)
 * Features OrbitControls, floating CAD toolbar, anatomical skin mesh,
 * semi-transparent splint, landmarks pinning raycaster, heatmap, and slicing plane.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useProject } from '../../context/ProjectContext';
import {
  generateArmGeometry,
  generateSplintGeometry,
  generateHeatmapColors,
} from '../../utils/proceduralMesh';
import {
  Eye,
  RotateCcw,
  Box,
  Flame,
  Grid,
  Maximize2,
  Ruler,
  Sliders,
  Crosshair,
} from 'lucide-react';

export const ThreeViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    state,
    updateLandmarkPosition,
    setActiveLandmark,
    toggleDisplayOption,
    addToast,
  } = useProject();

  // Internal Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const armMeshRef = useRef<THREE.Mesh | null>(null);
  const holeLineRef = useRef<THREE.LineSegments | null>(null);
  const splintMeshRef = useRef<THREE.Mesh | null>(null);
  const landmarkGroupRef = useRef<THREE.Group | null>(null);
  const axesGroupRef = useRef<THREE.Group | null>(null);
  const slicePlaneMeshRef = useRef<THREE.Mesh | null>(null);
  const fractureRingRef = useRef<THREE.Mesh | null>(null);

  // Orbit controls state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraSphericalRef = useRef({ radius: 360, theta: Math.PI / 4, phi: Math.PI / 3 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, -30));

  const [mouseCoordText, setMouseCoordText] = useState<string>('X: 0.0 Y: 0.0 Z: 0.0 mm');

  // Update camera position based on spherical coordinates
  const updateCamera = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = cameraSphericalRef.current;
    const target = cameraTargetRef.current;

    cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = target.y + radius * Math.cos(phi);
    cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(target);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF0F2F5); // Light clean CAD neutral gray
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 1, 2000);
    cameraRef.current = camera;
    updateCamera();

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Studio Lighting Setup (Key, Fill, Rim Light)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(200, 300, 250);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.45);
    fillLight.position.set(-200, -100, -150);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.4);
    rimLight.position.set(0, -200, 200);
    scene.add(rimLight);

    // Subtle CAD Floor Grid
    const gridHelper = new THREE.GridHelper(500, 25, 0xd0d7de, 0xe1e4e8);
    gridHelper.position.y = -65;
    gridHelper.position.z = -30;
    scene.add(gridHelper);

    // Anatomical Arm Mesh
    const { geometry: armGeom, holeGeometry: holeGeom } = generateArmGeometry();
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0xdeb89a, // Neutral warm skin tone
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const armMesh = new THREE.Mesh(armGeom, armMaterial);
    armMesh.name = 'armScanMesh';
    scene.add(armMesh);
    armMeshRef.current = armMesh;

    // Hole outline edges (bright red)
    const holeMaterial = new THREE.LineBasicMaterial({
      color: 0xc62828,
      linewidth: 2,
    });
    const holeLine = new THREE.LineSegments(holeGeom, holeMaterial);
    holeLine.visible = false;
    scene.add(holeLine);
    holeLineRef.current = holeLine;

    // Translucent Medical Splint Mesh
    const splintMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f6cbd, // Medical blue
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: state.displayOptions.splintOpacity,
      side: THREE.DoubleSide,
    });
    const splintMesh = new THREE.Mesh(new THREE.BufferGeometry(), splintMaterial);
    scene.add(splintMesh);
    splintMeshRef.current = splintMesh;

    // Landmarks Group
    const landmarkGroup = new THREE.Group();
    scene.add(landmarkGroup);
    landmarkGroupRef.current = landmarkGroup;

    // Segment Axes Group
    const axesGroup = new THREE.Group();
    scene.add(axesGroup);
    axesGroupRef.current = axesGroup;

    // Slicing transverse plane (Step 4)
    const slicePlaneGeom = new THREE.PlaneGeometry(160, 160);
    const slicePlaneMat = new THREE.MeshBasicMaterial({
      color: 0x0f6cbd,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    const slicePlaneMesh = new THREE.Mesh(slicePlaneGeom, slicePlaneMat);
    slicePlaneMesh.visible = state.currentStep === 4;
    scene.add(slicePlaneMesh);
    slicePlaneMeshRef.current = slicePlaneMesh;

    // Fracture Zone ring
    const fractureGeom = new THREE.RingGeometry(22, 25, 32);
    const fractureMat = new THREE.MeshBasicMaterial({
      color: 0xed8b00,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const fractureRing = new THREE.Mesh(fractureGeom, fractureMat);
    fractureRing.rotation.x = Math.PI / 2;
    scene.add(fractureRing);
    fractureRingRef.current = fractureRing;

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  // Update Splint Geometry whenever params, segments, or landmarks change
  useEffect(() => {
    if (!splintMeshRef.current) return;

    const { geometry, clearanceDistances } = generateSplintGeometry(
      state.params,
      state.segments,
      state.landmarks,
      state.fractureZone
    );

    splintMeshRef.current.geometry.dispose();
    splintMeshRef.current.geometry = geometry;

    // Handle Heatmap Vertex Coloring
    const mat = splintMeshRef.current.material as THREE.MeshStandardMaterial;
    if (state.displayOptions.showHeatmap) {
      const colors = generateHeatmapColors(
        geometry.getAttribute('position') as THREE.BufferAttribute,
        state.params
      );
      geometry.setAttribute('color', colors);
      mat.vertexColors = true;
      mat.color.setHex(0xffffff);
    } else {
      mat.vertexColors = false;
      mat.color.setHex(0x0f6cbd);
    }

    mat.opacity = state.displayOptions.splintOpacity;
    mat.wireframe = state.displayOptions.wireframe;
    mat.needsUpdate = true;
  }, [
    state.params,
    state.segments,
    state.landmarks,
    state.fractureZone,
    state.displayOptions.showHeatmap,
    state.displayOptions.splintOpacity,
    state.displayOptions.wireframe,
  ]);

  // Update Display Toggles (Visibility, Holes, Slice Plane, Fracture Zone)
  useEffect(() => {
    if (armMeshRef.current) {
      armMeshRef.current.visible = state.displayOptions.showScanMesh;
      (armMeshRef.current.material as THREE.MeshStandardMaterial).wireframe =
        state.displayOptions.wireframe;
    }
    if (holeLineRef.current) {
      holeLineRef.current.visible = state.displayOptions.showHoles;
    }
    if (splintMeshRef.current) {
      splintMeshRef.current.visible = state.displayOptions.showSplintMesh;
    }
    if (slicePlaneMeshRef.current) {
      slicePlaneMeshRef.current.visible = state.currentStep === 4;
      slicePlaneMeshRef.current.position.z = state.displayOptions.activeSliceZ;
    }
    if (fractureRingRef.current) {
      fractureRingRef.current.visible = state.fractureZone.hasZone;
      fractureRingRef.current.position.set(
        state.fractureZone.center[0],
        state.fractureZone.center[1],
        state.fractureZone.center[2]
      );
    }
  }, [
    state.displayOptions.showScanMesh,
    state.displayOptions.showSplintMesh,
    state.displayOptions.showHoles,
    state.displayOptions.wireframe,
    state.displayOptions.activeSliceZ,
    state.currentStep,
    state.fractureZone,
  ]);

  // Update Landmark 3D Pins
  useEffect(() => {
    if (!landmarkGroupRef.current) return;
    const group = landmarkGroupRef.current;

    // Clear existing
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    if (!state.displayOptions.showLandmarks) return;

    state.landmarks.forEach((lmk) => {
      if (!lmk.position || !lmk.isPinned) return;

      const isCurrentActive = state.activeLandmarkId === lmk.id;

      // Pin sphere
      const sphereGeom = new THREE.SphereGeometry(isCurrentActive ? 4.5 : 3.5, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: isCurrentActive ? 0xed8b00 : 0x0f6cbd,
        emissive: isCurrentActive ? 0x884400 : 0x002244,
        roughness: 0.3,
      });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      sphere.position.set(lmk.position[0], lmk.position[1], lmk.position[2]);
      sphere.userData = { landmarkId: lmk.id };
      group.add(sphere);

      // Pin stem
      const cylinderGeom = new THREE.CylinderGeometry(0.8, 0.8, 10, 8);
      const cylinderMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const stem = new THREE.Mesh(cylinderGeom, cylinderMat);
      stem.position.set(lmk.position[0], lmk.position[1] + 5, lmk.position[2]);
      group.add(stem);
    });
  }, [state.landmarks, state.activeLandmarkId, state.displayOptions.showLandmarks]);

  // Update Segment Axes Lines
  useEffect(() => {
    if (!axesGroupRef.current) return;
    const group = axesGroupRef.current;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (!state.displayOptions.showAxes) return;

    // Forearm anatomical center axis line
    const points = [
      new THREE.Vector3(0, 0, -155),
      new THREE.Vector3(0, 0, -135),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 42),
      new THREE.Vector3(0, 0, 110),
    ];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x2e7d32,
      dashSize: 6,
      gapSize: 3,
    });
    const line = new THREE.Line(lineGeom, lineMat);
    line.computeLineDistances();
    group.add(line);
  }, [state.displayOptions.showAxes]);

  // Mouse & Orbit Camera Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 2) {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Coordinate readout
    if (containerRef.current && cameraRef.current && armMeshRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObject(armMeshRef.current);
      if (intersects.length > 0) {
        const pt = intersects[0].point;
        setMouseCoordText(
          `X: ${pt.x.toFixed(1)} Y: ${pt.y.toFixed(1)} Z: ${pt.z.toFixed(1)} mm`
        );
      }
    }

    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    if (e.buttons === 1) {
      // Rotate
      cameraSphericalRef.current.theta -= deltaX * 0.008;
      cameraSphericalRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, cameraSphericalRef.current.phi - deltaY * 0.008)
      );
      updateCamera();
    } else if (e.buttons === 2) {
      // Pan
      cameraTargetRef.current.y += deltaY * 0.3;
      cameraTargetRef.current.z -= deltaX * 0.3;
      updateCamera();
    }

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    cameraSphericalRef.current.radius = Math.max(
      80,
      Math.min(900, cameraSphericalRef.current.radius + e.deltaY * 0.35)
    );
    updateCamera();
  };

  // Landmark Click Handler: Raycast to arm mesh when in Step 2 with active landmark
  const handleClick = (e: React.MouseEvent) => {
    if (state.currentStep !== 2 || !state.activeLandmarkId) return;
    if (!containerRef.current || !cameraRef.current || !armMeshRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObject(armMeshRef.current);

    if (intersects.length > 0) {
      const pt = intersects[0].point;
      updateLandmarkPosition(state.activeLandmarkId, [
        Math.round(pt.x * 10) / 10,
        Math.round(pt.y * 10) / 10,
        Math.round(pt.z * 10) / 10,
      ]);
    }
  };

  // Camera preset views
  const setCameraView = (type: 'iso' | 'front' | 'side' | 'top') => {
    if (type === 'iso') {
      cameraSphericalRef.current = { radius: 360, theta: Math.PI / 4, phi: Math.PI / 3 };
      cameraTargetRef.current.set(0, 0, -30);
    } else if (type === 'front') {
      cameraSphericalRef.current = { radius: 350, theta: 0, phi: Math.PI / 2 };
      cameraTargetRef.current.set(0, 0, -30);
    } else if (type === 'side') {
      cameraSphericalRef.current = { radius: 350, theta: Math.PI / 2, phi: Math.PI / 2 };
      cameraTargetRef.current.set(0, 0, -30);
    } else if (type === 'top') {
      cameraSphericalRef.current = { radius: 350, theta: 0, phi: 0.05 };
      cameraTargetRef.current.set(0, 0, -30);
    }
    updateCamera();
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
      className="relative flex-1 h-full w-full bg-[#F0F2F5] overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating CAD Toolbar in Top-Left Corner */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 p-1 bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-lg shadow-sm">
        {/* Camera Presets */}
        <div className="flex items-center gap-1 border-b border-slate-100 pb-1 px-1">
          <button
            type="button"
            onClick={() => setCameraView('iso')}
            title="Góc nhìn phối cảnh (Isometric)"
            className="px-1.5 py-1 text-[10px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            ISO
          </button>
          <button
            type="button"
            onClick={() => setCameraView('front')}
            title="Nhìn thẳng (Front)"
            className="px-1.5 py-1 text-[10px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            Trước
          </button>
          <button
            type="button"
            onClick={() => setCameraView('side')}
            title="Nhìn cạnh (Lateral)"
            className="px-1.5 py-1 text-[10px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            Cạnh
          </button>
          <button
            type="button"
            onClick={() => setCameraView('top')}
            title="Nhìn trên xuống (Top)"
            className="px-1.5 py-1 text-[10px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            Trên
          </button>
          <button
            type="button"
            onClick={() => setCameraView('iso')}
            title="Đặt lại góc nhìn trung tâm"
            className="p-1 text-slate-500 hover:text-slate-800 rounded"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Viewport Visualization Toggles */}
        <div className="flex items-center gap-1 px-1">
          {/* Wireframe toggle */}
          <button
            type="button"
            onClick={() => toggleDisplayOption('wireframe')}
            title="Bật/Tắt khung lưới tam giác (Wireframe)"
            className={`p-1.5 rounded transition-colors ${
              state.displayOptions.wireframe
                ? 'bg-[#0F6CBD] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Heatmap toggle */}
          <button
            type="button"
            onClick={() => toggleDisplayOption('showHeatmap')}
            title="Bật/Tắt bản đồ nhiệt khoảng hở (Clearance Heatmap)"
            className={`p-1.5 rounded transition-colors ${
              state.displayOptions.showHeatmap
                ? 'bg-amber-500 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
          </button>

          {/* Splint visibility */}
          <button
            type="button"
            onClick={() => toggleDisplayOption('showSplintMesh')}
            title="Hiện/Ẩn nẹp thiết kế"
            className={`p-1.5 rounded transition-colors ${
              state.displayOptions.showSplintMesh
                ? 'bg-blue-50 text-[#0F6CBD]'
                : 'text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
          </button>

          {/* Landmarks pins visibility */}
          <button
            type="button"
            onClick={() => toggleDisplayOption('showLandmarks')}
            title="Hiện/Ẩn các mốc giải phẫu"
            className={`p-1.5 rounded transition-colors ${
              state.displayOptions.showLandmarks
                ? 'bg-blue-50 text-[#0F6CBD]'
                : 'text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Splint Opacity Quick Slider */}
        <div className="flex items-center gap-1.5 px-1.5 pt-1 border-t border-slate-100">
          <span className="text-[10px] text-slate-500 font-medium">Độ mờ:</span>
          <input
            type="range"
            min={0.15}
            max={1.0}
            step={0.05}
            value={state.displayOptions.splintOpacity}
            onChange={(e) =>
              toggleDisplayOption('splintOpacity', parseFloat(e.target.value))
            }
            className="w-16 h-1 accent-[#0F6CBD] cursor-pointer"
            title="Độ trong suốt của nẹp"
          />
        </div>
      </div>

      {/* Interactive Step 2 Pinning Banner Notice */}
      {state.currentStep === 2 && state.activeLandmarkId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-white px-3.5 py-1.5 rounded-full shadow-md text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Crosshair className="w-4 h-4 animate-spin" />
          <span>Bấm lên mô hình 3D để ghim mốc đang chọn</span>
        </div>
      )}

      {/* Heatmap Legend Bar (When heatmap is active) */}
      {state.displayOptions.showHeatmap && (
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-2 shadow-sm text-xs select-none">
          <div className="font-semibold text-slate-800 text-[11px] mb-1 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Bản đồ nhiệt khoảng cách da - nẹp
          </div>
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div className="w-6 h-3 bg-[#C62828] rounded-xs" />
              <span className="text-[9px] text-slate-600 mt-0.5">&lt;1.5mm</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-6 h-3 bg-[#7CB342] rounded-xs" />
              <span className="text-[9px] text-slate-600 mt-0.5">2mm</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-3 bg-[#2E7D32] rounded-xs" />
              <span className="text-[9px] text-emerald-700 font-bold mt-0.5">2-8mm (Đạt)</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-6 h-3 bg-[#ED8B00] rounded-xs" />
              <span className="text-[9px] text-slate-600 mt-0.5">10mm</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-6 h-3 bg-[#0F6CBD] rounded-xs" />
              <span className="text-[9px] text-slate-600 mt-0.5">&gt;11mm</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom coordinate readout */}
      <div className="absolute bottom-3 right-3 z-20 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-mono tabular-nums pointer-events-none">
        {mouseCoordText}
      </div>
    </div>
  );
};
