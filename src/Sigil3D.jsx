import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { BUILDERS_3D, buildNumberLabels } from './sigil3d.js'

const Sigil3D = forwardRef(({ pattern, reading, numbers, palette, size = 520 }, ref) => {
  const mountRef = useRef(null)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const groupRef = useRef(null)
  const animRef = useRef(null)
  const dragRef = useRef({ active: false, x: 0, y: 0, rx: 0.3, ry: 0, vy: 0.003 })

  useImperativeHandle(ref, () => ({
    toDataURL: () => {
      const r = rendererRef.current
      if (!r) return null
      // force a fresh render so the framebuffer is populated (preserveDrawingBuffer is on)
      r.render(sceneRef.current, cameraRef.current)
      return r.domElement.toDataURL('image/png')
    }
  }))

  // one-time setup
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = null
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0, 6)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(size, size)
    renderer.setClearColor(0x000000, 0)
    rendererRef.current = renderer
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)
    groupRef.current = group

    // drag-to-orbit
    const dom = renderer.domElement
    const onDown = (e) => {
      dragRef.current.active = true
      dragRef.current.x = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      dragRef.current.y = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      dom.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      if (!dragRef.current.active) return
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      const dx = x - dragRef.current.x
      const dy = y - dragRef.current.y
      dragRef.current.x = x
      dragRef.current.y = y
      dragRef.current.ry += dx * 0.008
      dragRef.current.rx += dy * 0.008
      dragRef.current.rx = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, dragRef.current.rx))
    }
    const onUp = () => {
      dragRef.current.active = false
      dom.style.cursor = 'grab'
    }
    dom.style.cursor = 'grab'
    dom.addEventListener('mousedown', onDown)
    dom.addEventListener('touchstart', onDown, { passive: true })
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)

    const animate = () => {
      if (!dragRef.current.active) dragRef.current.ry += dragRef.current.vy
      const g = groupRef.current
      if (g) {
        g.rotation.x = dragRef.current.rx
        g.rotation.y = dragRef.current.ry
      }
      renderer.render(scene, camera)
      animRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      dom.removeEventListener('mousedown', onDown)
      dom.removeEventListener('touchstart', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
      renderer.dispose()
      if (dom.parentNode) dom.parentNode.removeChild(dom)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // rebuild geometry when pattern / reading / numbers change
  useEffect(() => {
    const group = groupRef.current
    if (!group || !reading || !pattern) return

    // clear previous geometry
    while (group.children.length) {
      const obj = group.children.pop()
      obj.geometry?.dispose?.()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose?.())
      }
    }

    const R = 2.2
    const symmetry = Math.max(3, Math.min(12, Math.floor(reading.symmetry || 6)))
    const layers = Math.max(3, Math.min(9, Math.floor(reading.layers || 5)))
    const phi = Math.max(0.5, Math.min(2, Number(reading.phi_ratio) || 1))
    const { c1, c2, ca } = palette
    const builder = BUILDERS_3D[pattern] || BUILDERS_3D.mandala
    builder({ group, R, symmetry, layers, c1, c2, ca, numbers, phi })
    buildNumberLabels({ group, R, numbers, c1 })
  }, [pattern, reading, numbers, palette])

  return <div ref={mountRef} className="three-wrap" style={{ width: size, height: size }} />
})

export default Sigil3D
