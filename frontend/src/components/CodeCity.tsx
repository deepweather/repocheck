import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CommitInfo } from "../types";

type Metric = "commits" | "lines" | "recency" | "bugs";

interface FileStats {
  path: string;
  dir: string;
  name: string;
  commits: number;
  lines: number;
  bugCommits: number;
  lastCommitDate: number;
  contributorCount: number;
}

interface Block {
  file: FileStats;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
}

const DIR_COLORS = [
  "#8b7cf6", "#f47067", "#34d399", "#e5b844", "#56d4c8",
  "#a498ff", "#ff9f7f", "#5eead4", "#fbbf24", "#818cf8",
  "#fb7185", "#4ade80", "#f59e0b", "#22d3ee",
];

function computeFileStats(commits: CommitInfo[]): FileStats[] {
  const map = new Map<string, FileStats>();

  for (const c of commits) {
    const totalLines = c.insertions + c.deletions;
    const date = new Date(c.date).getTime();
    const perFile = Math.max(Math.ceil(totalLines / Math.max(c.files.length, 1)), 1);

    for (const fpath of c.files) {
      let fs = map.get(fpath);
      if (!fs) {
        const parts = fpath.split("/");
        fs = {
          path: fpath,
          dir: parts.length > 1 ? parts[0] : ".",
          name: parts[parts.length - 1],
          commits: 0,
          lines: 0,
          bugCommits: 0,
          lastCommitDate: 0,
          contributorCount: 0,
        };
        map.set(fpath, fs);
      }
      fs.commits++;
      fs.lines += perFile;
      if (c.type === "bugfix") fs.bugCommits++;
      if (date > fs.lastCommitDate) fs.lastCommitDate = date;
    }
  }

  // Count unique contributors per file
  for (const [fpath, fs] of map) {
    const authors = new Set<string>();
    for (const c of commits) {
      if (c.files.includes(fpath)) authors.add(c.author_id);
    }
    fs.contributorCount = authors.size;
  }

  return Array.from(map.values()).filter((f) => f.commits > 0);
}

function layoutCity(files: FileStats[], metric: Metric): Block[] {
  const dirGroups = new Map<string, FileStats[]>();
  for (const f of files) {
    const group = dirGroups.get(f.dir) || [];
    group.push(f);
    dirGroups.set(f.dir, group);
  }

  const dirs = Array.from(dirGroups.entries()).sort((a, b) => b[1].length - a[1].length);
  const dirColorMap = new Map<string, string>();
  dirs.forEach(([dir], i) => dirColorMap.set(dir, DIR_COLORS[i % DIR_COLORS.length]));

  const now = Date.now();
  const maxVals = { commits: 1, lines: 1, bugs: 1 };
  for (const f of files) {
    maxVals.commits = Math.max(maxVals.commits, f.commits);
    maxVals.lines = Math.max(maxVals.lines, f.lines);
    maxVals.bugs = Math.max(maxVals.bugs, f.bugCommits);
  }

  function getHeight(f: FileStats): number {
    const base = 0.2;
    switch (metric) {
      case "commits": return base + (f.commits / maxVals.commits) * 6;
      case "lines": return base + (f.lines / maxVals.lines) * 6;
      case "recency": {
        const age = (now - f.lastCommitDate) / (1000 * 60 * 60 * 24);
        return base + Math.max(0, 1 - age / 180) * 6;
      }
      case "bugs": return base + (f.bugCommits / maxVals.bugs) * 6;
    }
  }

  const blocks: Block[] = [];
  let districtX = 0;
  const BLOCK = 0.7;
  const PAD = 0.12;
  const DIST_GAP = 1.2;

  for (const [dir, dirFiles] of dirs) {
    const cols = Math.ceil(Math.sqrt(dirFiles.length));
    const color = dirColorMap.get(dir)!;

    dirFiles.sort((a, b) => getHeight(b) - getHeight(a));

    for (let i = 0; i < dirFiles.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      blocks.push({
        file: dirFiles[i],
        x: districtX + col * (BLOCK + PAD),
        z: row * (BLOCK + PAD),
        w: BLOCK,
        d: BLOCK,
        h: getHeight(dirFiles[i]),
        color,
      });
    }
    districtX += cols * (BLOCK + PAD) + DIST_GAP;
  }

  const midX = districtX / 2;
  const maxZ = blocks.length > 0 ? Math.max(...blocks.map((b) => b.z)) / 2 : 0;
  for (const b of blocks) { b.x -= midX; b.z -= maxZ; }

  return blocks;
}

export default function CodeCity({ commits }: { commits: CommitInfo[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    meshes: THREE.Mesh[];
    frameId: number;
  } | null>(null);

  const [metric, setMetric] = useState<Metric>("commits");
  const [hovered, setHovered] = useState<FileStats | null>(null);

  const fileStats = useMemo(() => computeFileStats(commits), [commits]);
  const blocks = useMemo(() => layoutCity(fileStats, metric), [fileStats, metric]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cleanup previous
    if (sceneRef.current) {
      cancelAnimationFrame(sceneRef.current.frameId);
      sceneRef.current.renderer.dispose();
      container.innerHTML = "";
      sceneRef.current = null;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#111113");
    scene.fog = new THREE.FogExp2(0x111113, 0.015);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500);
    camera.position.set(12, 16, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 3;
    controls.maxDistance = 80;

    // Ground
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: "#19191d", roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Lights
    scene.add(new THREE.AmbientLight("#ffffff", 0.5));
    const sun = new THREE.DirectionalLight("#ffffff", 0.7);
    sun.position.set(20, 25, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.near = 0.5; sc.far = 80; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30;
    scene.add(sun);

    // Blocks
    const meshes: THREE.Mesh[] = [];
    for (const block of blocks) {
      const geo = new THREE.BoxGeometry(block.w, block.h, block.d);
      const mat = new THREE.MeshStandardMaterial({ color: block.color, roughness: 0.65, metalness: 0.1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(block.x, block.h / 2, block.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      (mesh as any)._block = block;
      scene.add(mesh);
      meshes.push(mesh);
    }

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredMesh: THREE.Mesh | null = null;
    let origColor: THREE.Color | null = null;

    const onMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(meshes);

      if (hoveredMesh && hoveredMesh !== hits[0]?.object) {
        (hoveredMesh.material as THREE.MeshStandardMaterial).color.copy(origColor!);
        (hoveredMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        hoveredMesh = null;
        setHovered(null);
      }

      if (hits.length > 0) {
        const obj = hits[0].object as THREE.Mesh;
        if (obj !== hoveredMesh) {
          hoveredMesh = obj;
          origColor = (obj.material as THREE.MeshStandardMaterial).color.clone();
          (obj.material as THREE.MeshStandardMaterial).emissive.setHex(0x222222);
          setHovered((obj as any)._block.file);
        }
      }
    };

    renderer.domElement.addEventListener("mousemove", onMove);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { renderer, scene, camera, controls, meshes, frameId };

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousemove", onMove);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [blocks]);

  return (
    <div className="code-city">
      <div className="code-city__controls">
        <div className="code-city__modes">
          {(["commits", "lines", "recency", "bugs"] as Metric[]).map((m) => (
            <button
              key={m}
              className={`code-city__mode ${metric === m ? "code-city__mode--active" : ""}`}
              onClick={() => setMetric(m)}
            >
              {m}
            </button>
          ))}
        </div>
        {hovered && (
          <div className="code-city__tooltip">
            <strong>{hovered.path}</strong>
            <span>{hovered.commits} commits · {hovered.lines} lines · {hovered.bugCommits} bugs · {hovered.contributorCount} devs</span>
          </div>
        )}
        <div className="code-city__legend">
          {fileStats.length} files · drag to rotate · scroll to zoom
        </div>
      </div>
      <div className="code-city__canvas" ref={containerRef} />
    </div>
  );
}
