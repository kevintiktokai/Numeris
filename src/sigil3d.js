import * as THREE from 'three'

const hexToRGB = (hex) => {
  const m = hex.replace('#', '')
  return {
    r: parseInt(m.slice(0, 2), 16) / 255,
    g: parseInt(m.slice(2, 4), 16) / 255,
    b: parseInt(m.slice(4, 6), 16) / 255
  }
}

const color = (hex) => {
  const c = new THREE.Color()
  const { r, g, b } = hexToRGB(hex)
  c.setRGB(r, g, b)
  return c
}

const polyLine = (points, col, opacity = 1) => {
  const geom = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.LineBasicMaterial({ color: color(col), transparent: true, opacity, linewidth: 1 })
  return new THREE.Line(geom, mat)
}

const dot = (pos, col, size = 0.02, opacity = 1) => {
  const geom = new THREE.SphereGeometry(size, 16, 12)
  const mat = new THREE.MeshBasicMaterial({ color: color(col), transparent: true, opacity })
  const m = new THREE.Mesh(geom, mat)
  m.position.copy(pos)
  return m
}

// Draw the outer boundary ring in the plane z=0
const boundaryRing = (R, c1) => {
  const points = []
  const segs = 128
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0))
  }
  return polyLine(points, c1, 0.55)
}

// Ambient central glow as a soft sphere
const ambientGlow = (R, c1) => {
  const geom = new THREE.SphereGeometry(R * 0.08, 24, 18)
  const mat = new THREE.MeshBasicMaterial({
    color: color(c1),
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  return new THREE.Mesh(geom, mat)
}

// ───────────────────────────────────────────────────────────────────────
// Mandala 3D: stacked concentric polygon rings on the z-axis + 3D phi helix
// ───────────────────────────────────────────────────────────────────────

const buildMandala3D = ({ group, R, symmetry, layers, c1, c2, ca, numbers, phi }) => {
  const N = Math.max(3, symmetry)
  const zSpread = R * 0.6

  // stacked polygons
  for (let l = 0; l < layers; l++) {
    const t = l / Math.max(1, layers - 1)
    const r = R * (0.35 + 0.6 * (1 - t))
    const z = (t - 0.5) * zSpread
    const col = l % 2 ? c2 : c1
    const opacity = 0.35 + 0.55 * (1 - t)
    const pts = []
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z))
    }
    group.add(polyLine(pts, col, opacity))
  }

  // vertical connectors between consecutive layers (reveals the 3D structure)
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2
    const pts = []
    for (let l = 0; l < layers; l++) {
      const t = l / Math.max(1, layers - 1)
      const r = R * (0.35 + 0.6 * (1 - t))
      const z = (t - 0.5) * zSpread
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z))
    }
    group.add(polyLine(pts, ca, 0.3))
  }

  // star connectors across outermost polygon
  const outerR = R * 0.95
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a1 = (i / N) * Math.PI * 2 - Math.PI / 2
      const a2 = (j / N) * Math.PI * 2 - Math.PI / 2
      const pts = [
        new THREE.Vector3(Math.cos(a1) * outerR, Math.sin(a1) * outerR, -zSpread / 2),
        new THREE.Vector3(Math.cos(a2) * outerR, Math.sin(a2) * outerR, -zSpread / 2)
      ]
      group.add(polyLine(pts, c2, 0.18))
    }
  }

  // phi helix rising through the stack
  const seed = numbers[0] || 1
  const helixPts = []
  const tMax = Math.PI * 6
  for (let t = 0; t <= tMax; t += 0.05) {
    const r = (t / tMax) * outerR * (phi / 1.62)
    const a = t + seed * 0.3
    const z = (t / tMax - 0.5) * zSpread * 1.1
    helixPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z))
  }
  group.add(polyLine(helixPts, ca, 0.8))

  // boundary rings top + bottom + middle
  const topRing = boundaryRing(R, c1); topRing.position.z = zSpread / 2; group.add(topRing)
  const midRing = boundaryRing(R, c1); group.add(midRing)
  const botRing = boundaryRing(R, c1); botRing.position.z = -zSpread / 2; group.add(botRing)

  group.add(ambientGlow(R, c1))
}

// ───────────────────────────────────────────────────────────────────────
// Interference 3D: genuine height-field where z = Σ amplitude_i
// ───────────────────────────────────────────────────────────────────────

const buildInterference3D = ({ group, R, symmetry, layers, c1, c2, ca, numbers, phi }) => {
  const N = numbers.length || 1
  const sourceR = R * 0.36
  const sources = numbers.map((n, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2
    return { x: Math.cos(a) * sourceR, y: Math.sin(a) * sourceR, k: 2 + (Math.abs(n) % 5) * 0.4, phase: (n % 7) * 0.3 }
  })

  const seg = 96
  const size = R * 2
  const geom = new THREE.PlaneGeometry(size, size, seg, seg)
  const pos = geom.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const colorPrimary = color(c1)
  const colorAccent = color(ca)

  let maxAmp = 0
  const amps = new Float32Array(pos.count)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    let z = 0
    for (const s of sources) {
      const d = Math.hypot(x - s.x, y - s.y)
      z += Math.sin(d * s.k + s.phase) / (1 + d * 0.5)
    }
    amps[i] = z
    if (Math.abs(z) > maxAmp) maxAmp = Math.abs(z)
  }

  const scale = maxAmp > 0 ? (R * 0.22) / maxAmp : 0
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, amps[i] * scale)
    const t = (amps[i] / (maxAmp || 1) + 1) / 2 // 0..1
    const r = colorAccent.r * (1 - t) + colorPrimary.r * t
    const g = colorAccent.g * (1 - t) + colorPrimary.g * t
    const b = colorAccent.b * (1 - t) + colorPrimary.b * t
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }
  pos.needsUpdate = true
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geom.computeVertexNormals()

  // wireframe over colored mesh gives the interference-pattern look
  const meshMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide
  })
  const mesh = new THREE.Mesh(geom, meshMat)
  group.add(mesh)

  const wireGeom = new THREE.WireframeGeometry(geom)
  const wireMat = new THREE.LineBasicMaterial({ color: color(c2), transparent: true, opacity: 0.22 })
  group.add(new THREE.LineSegments(wireGeom, wireMat))

  // sources as bright dots hovering above the field
  sources.forEach((s) => {
    const p = new THREE.Vector3(s.x, s.y, R * 0.12)
    const d = dot(p, ca, R * 0.018, 1)
    group.add(d)
    // thin vertical line dropping from each source to the plane
    group.add(polyLine([p, new THREE.Vector3(s.x, s.y, -R * 0.02)], ca, 0.35))
  })

  group.add(boundaryRing(R, c1))
}

// ───────────────────────────────────────────────────────────────────────
// Constellation 3D: nodes and edges in (x,y,z); genuine 3D star map
// ───────────────────────────────────────────────────────────────────────

const buildConstellation3D = ({ group, R, symmetry, layers, c1, c2, ca, numbers, phi }) => {
  const nodes = []
  numbers.forEach((n, i) => {
    const azimuth = (n * 0.31 + i) % (Math.PI * 2)
    const polar = ((n * 0.17) % Math.PI) * 0.6 + Math.PI * 0.2
    const radius = ((Math.abs(n) % 100) / 100) * R * 0.7 + R * 0.18
    const x = radius * Math.sin(polar) * Math.cos(azimuth)
    const y = radius * Math.sin(polar) * Math.sin(azimuth)
    const z = radius * Math.cos(polar)
    nodes.push({ pos: new THREE.Vector3(x, y, z), main: true, n })
    const subs = 2 + (Math.abs(n) % 4)
    for (let s = 0; s < subs; s++) {
      const dAz = (s - subs / 2) * 0.4 + (Math.abs(n) % 7) * 0.08
      const dPol = ((s * 0.47) % 1 - 0.5) * 0.9
      const dR = (s + 1) * R * 0.06 * (s % 2 === 0 ? 1 : -1)
      const rr = Math.max(R * 0.08, Math.min(R * 0.85, radius + dR))
      const pp = Math.max(0.1, Math.min(Math.PI - 0.1, polar + dPol))
      const aa = azimuth + dAz
      nodes.push({
        pos: new THREE.Vector3(
          rr * Math.sin(pp) * Math.cos(aa),
          rr * Math.sin(pp) * Math.sin(aa),
          rr * Math.cos(pp)
        ),
        main: false
      })
    }
  })

  const threshold = R * 0.5
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = nodes[i].pos.distanceTo(nodes[j].pos)
      if (d < threshold) {
        const opacity = (1 - d / threshold) * 0.45
        group.add(polyLine([nodes[i].pos, nodes[j].pos], c2, opacity))
      }
    }
  }

  nodes.forEach((node) => {
    if (node.main) {
      // bright core + soft halo
      group.add(dot(node.pos, c1, R * 0.018, 1))
      const haloGeom = new THREE.SphereGeometry(R * 0.045, 24, 18)
      const haloMat = new THREE.MeshBasicMaterial({
        color: color(c1),
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const halo = new THREE.Mesh(haloGeom, haloMat)
      halo.position.copy(node.pos)
      group.add(halo)
    } else {
      group.add(dot(node.pos, ca, R * 0.008, 0.7))
    }
  })

  group.add(boundaryRing(R, c1))
  group.add(ambientGlow(R, c1))
}

// ───────────────────────────────────────────────────────────────────────
// Spiral 3D: logarithmic helix branches climbing Z — DNA-like
// ───────────────────────────────────────────────────────────────────────

const buildSpiral3D = ({ group, R, symmetry, layers, c1, c2, ca, numbers, phi }) => {
  const N = Math.max(2, symmetry)
  const tMax = Math.PI * 5
  const zSpread = R * 0.9

  for (let b = 0; b < N; b++) {
    const rot = (b / N) * Math.PI * 2
    const col = b % 2 === 0 ? c1 : c2
    const pts = []
    for (let t = 0; t < tMax; t += 0.04) {
      const r = (t / tMax) * R * 0.92 * (phi / 1.62)
      const a = t + rot
      const z = (t / tMax - 0.5) * zSpread
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z))
    }
    group.add(polyLine(pts, col, 0.7))

    numbers.forEach((n) => {
      const t = ((Math.abs(n) % 100) / 100) * tMax * 0.9 + 0.2
      const r = (t / tMax) * R * 0.92 * (phi / 1.62)
      const a = t + rot
      const z = (t / tMax - 0.5) * zSpread
      const p = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z)
      group.add(dot(p, ca, R * 0.012, 1))
      // tiny orbit ring around the marker
      const ringGeom = new THREE.RingGeometry(R * 0.016, R * 0.02, 24)
      const ringMat = new THREE.MeshBasicMaterial({
        color: color(ca),
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ring.position.copy(p)
      ring.lookAt(new THREE.Vector3(0, 0, z))
      group.add(ring)
    })
  }

  // boundary rings at top, middle, bottom
  const top = boundaryRing(R, c1); top.position.z = zSpread / 2; group.add(top)
  group.add(boundaryRing(R, c1))
  const bot = boundaryRing(R, c1); bot.position.z = -zSpread / 2; group.add(bot)

  group.add(ambientGlow(R, c1))
}

export const BUILDERS_3D = {
  mandala: buildMandala3D,
  interference: buildInterference3D,
  constellation: buildConstellation3D,
  spiral: buildSpiral3D
}

// Number labels placed around the outer ring as sprite-based textures
export const buildNumberLabels = ({ group, R, numbers, c1 }) => {
  const ringR = R * 1.1
  numbers.forEach((n, i) => {
    const a = (i / numbers.length) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(a) * ringR
    const y = Math.sin(a) * ringR
    const canvas = document.createElement('canvas')
    canvas.width = 128; canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = c1
    ctx.font = "28px 'Space Mono', monospace"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(n), 64, 32)
    const tex = new THREE.CanvasTexture(canvas)
    tex.minFilter = THREE.LinearFilter
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9 })
    const sprite = new THREE.Sprite(mat)
    sprite.position.set(x, y, 0)
    sprite.scale.set(R * 0.18, R * 0.09, 1)
    group.add(sprite)
  })
}
