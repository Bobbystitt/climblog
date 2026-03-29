'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { GRADE_SCALE } from '@/constants/grades'
import { COLOR_OPTIONS, climbColor } from '@/constants/colors'
import {
  fetchZoneById,
  fetchClimbsByZone,
  fetchUserProfile,
  deleteClimb,
  deleteClimbsByZone,
  insertClimb,
} from '@/lib/queries'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const TAG_OPTIONS = ['Crimpy', 'Slopey', 'Juggy', 'Overhang', 'Slab', 'Pinchy', 'Powerful', 'Balancy']
const DISCIPLINE_OPTIONS = ['Boulder', 'Lead', 'Top Rope', 'Autobelay']

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function PhotoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

// ─── Reset Confirmation Modal ─────────────────────────────────────────────────

function ResetConfirmModal({ onCancel, onConfirm, resetting }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-40" onClick={onCancel} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-base font-bold text-zinc-100 mb-1.5">Reset Zone?</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            This will delete all climbs in this zone. Are you sure?
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={resetting}
            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] disabled:opacity-50 transition-all text-sm font-semibold text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={resetting}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] disabled:opacity-50 transition-all text-sm font-semibold text-white"
          >
            {resetting ? 'Deleting…' : 'Confirm'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Grade Drum Picker ────────────────────────────────────────────────────────

function GradePicker({ value, onChange }) {
  const containerRef = useRef(null)
  const ITEM_HEIGHT = 44

  useEffect(() => {
    const idx = GRADE_SCALE.indexOf(value)
    if (idx !== -1 && containerRef.current) {
      containerRef.current.scrollTop = idx * ITEM_HEIGHT
    }
  }, [])

  function handleScroll() {
    if (!containerRef.current) return
    const idx = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT)
    const clamped = Math.max(0, Math.min(GRADE_SCALE.length - 1, idx))
    onChange(GRADE_SCALE[clamped])
  }

  return (
    <div className="relative h-[132px] overflow-hidden rounded-xl bg-zinc-800">
      {/* Selection highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-[44px] h-[44px] bg-zinc-700/60 border-y border-zinc-600 z-10" />
      {/* Fades */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-zinc-800 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-800 to-transparent z-10" />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scroll-smooth"
        style={{ scrollSnapType: 'y mandatory', paddingTop: 44, paddingBottom: 44 }}
      >
        {GRADE_SCALE.map((g) => (
          <div
            key={g}
            style={{ scrollSnapAlign: 'center', height: ITEM_HEIGHT }}
            className={`flex items-center justify-center text-sm font-bold transition-colors ${
              value === g ? 'text-zinc-100' : 'text-zinc-500'
            }`}
          >
            {g}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Image Editor ─────────────────────────────────────────────────────────────

function ImageEditor({ sourceFile, climbColorHex, visible, exportRef }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const origImgRef = useRef(null)
  const draggingRef = useRef(null)

  const [activeTool, setActiveTool] = useState('route')
  const [routePoints, setRoutePoints] = useState([])
  const [holdMarkers, setHoldMarkers] = useState([])
  const [cropRect, setCropRect] = useState(null)

  // Always expose latest getFile via exportRef
  useEffect(() => { if (exportRef) exportRef.current = { getFile } })

  // Load image whenever sourceFile changes
  useEffect(() => {
    if (!sourceFile) return
    const url = URL.createObjectURL(sourceFile)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      imgRef.current = img
      origImgRef.current = img
      const w = img.naturalWidth, h = img.naturalHeight
      const canvas = canvasRef.current
      if (canvas) { canvas.width = w; canvas.height = h }
      setRoutePoints([
        { x: w * 0.5, y: h * 0.88 },
        { x: w * 0.5, y: h * 0.62 },
        { x: w * 0.5, y: h * 0.38 },
        { x: w * 0.5, y: h * 0.12 },
      ])
      setHoldMarkers([])
      setCropRect({ x: 0, y: 0, w, h })
    }
    img.src = url
  }, [sourceFile])

  // Redraw on any state or visibility change
  useEffect(() => { redraw() }, [activeTool, routePoints, holdMarkers, cropRect, climbColorHex, visible])

  function getScale() {
    const canvas = canvasRef.current
    if (!canvas) return 1
    const dw = canvas.getBoundingClientRect().width
    return dw > 0 ? canvas.width / dw : 1
  }

  function redraw(forExport = false) {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    const s = forExport ? 1 : getScale()
    const col = climbColorHex || '#6366f1'

    // Hold markers
    holdMarkers.forEach(m => {
      ctx.beginPath()
      ctx.arc(m.x, m.y, 20 * s, 0, Math.PI * 2)
      ctx.fillStyle = col + '80'
      ctx.fill()
      ctx.strokeStyle = col
      ctx.lineWidth = 2 * s
      ctx.stroke()
    })

    // Route line
    if (routePoints.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(routePoints[0].x, routePoints[0].y)
      routePoints.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
      ctx.strokeStyle = col
      ctx.lineWidth = 4 * s
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()

      // Arrowhead at topmost point
      const topIdx = routePoints.reduce((b, p, i) => p.y < routePoints[b].y ? i : b, 0)
      const top = routePoints[topIdx]
      const nbr = routePoints[topIdx > 0 ? topIdx - 1 : topIdx + 1]
      const angle = Math.atan2(top.y - nbr.y, top.x - nbr.x)
      const sz = 22 * s
      ctx.beginPath()
      ctx.moveTo(top.x, top.y)
      ctx.lineTo(top.x - sz * Math.cos(angle - Math.PI / 6), top.y - sz * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(top.x - sz * Math.cos(angle + Math.PI / 6), top.y - sz * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fillStyle = col
      ctx.fill()
    }

    if (!forExport) {
      // Route drag handles
      if (activeTool === 'route') {
        routePoints.forEach(p => {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 14 * s, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.92)'
          ctx.fill()
          ctx.strokeStyle = col
          ctx.lineWidth = 3 * s
          ctx.stroke()
        })
      }

      // Crop overlay
      if (activeTool === 'crop' && cropRect) {
        const { x, y, w, h } = cropRect
        const cw = canvas.width, ch = canvas.height
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(0, 0, cw, y)
        ctx.fillRect(0, y + h, cw, ch - y - h)
        ctx.fillRect(0, y, x, h)
        ctx.fillRect(x + w, y, cw - x - w, h)
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = 2 * s
        ctx.strokeRect(x, y, w, h)
        // Rule-of-thirds guides
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'
        ctx.lineWidth = s
        ctx.beginPath()
        ;[1/3, 2/3].forEach(t => {
          ctx.moveTo(x + w * t, y); ctx.lineTo(x + w * t, y + h)
          ctx.moveTo(x, y + h * t); ctx.lineTo(x + w, y + h * t)
        })
        ctx.stroke()
        // Corner handles
        const hs = 13 * s
        ctx.fillStyle = 'white'
        ;[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy]) => {
          ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs)
        })
      }
    }
  }

  function getCoords(e) {
    const canvas = canvasRef.current
    const touch = e.touches?.[0] ?? e.changedTouches?.[0]
    const cx = touch ? touch.clientX : e.clientX
    const cy = touch ? touch.clientY : e.clientY
    const rect = canvas.getBoundingClientRect()
    const s = canvas.width / rect.width
    return { x: (cx - rect.left) * s, y: (cy - rect.top) * s }
  }

  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    if (!len2) return Math.hypot(px - ax, py - ay)
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
    return Math.hypot(px - ax - t * dx, py - ay - t * dy)
  }

  function handleDown(e) {
    e.preventDefault()
    const { x, y } = getCoords(e)
    const s = getScale()

    if (activeTool === 'route') {
      const hitR = 14 * s * 1.8
      const idx = routePoints.findIndex(p => Math.hypot(p.x - x, p.y - y) < hitR)
      if (idx !== -1) { draggingRef.current = { type: 'pt', idx }; return }
      // Insert point on nearest segment
      let best = -1, bestD = hitR * 1.5
      routePoints.forEach((p, i) => {
        if (i === routePoints.length - 1) return
        const d = segDist(x, y, p.x, p.y, routePoints[i + 1].x, routePoints[i + 1].y)
        if (d < bestD) { bestD = d; best = i }
      })
      if (best !== -1) setRoutePoints(prev => { const pts = [...prev]; pts.splice(best + 1, 0, { x, y }); return pts })
    } else if (activeTool === 'holds') {
      const holdHR = 20 * s * 1.5
      const idx = holdMarkers.findIndex(m => Math.hypot(m.x - x, m.y - y) < holdHR)
      if (idx !== -1) setHoldMarkers(prev => prev.filter((_, i) => i !== idx))
      else setHoldMarkers(prev => [...prev, { x, y }])
    } else if (activeTool === 'crop' && cropRect) {
      const cropHS = 13 * s * 2
      const { x: rx, y: ry, w: rw, h: rh } = cropRect
      const corners = [
        { n: 'tl', cx: rx, cy: ry }, { n: 'tr', cx: rx + rw, cy: ry },
        { n: 'bl', cx: rx, cy: ry + rh }, { n: 'br', cx: rx + rw, cy: ry + rh },
      ]
      const corner = corners.find(c => Math.hypot(c.cx - x, c.cy - y) < cropHS)
      if (corner) { draggingRef.current = { type: 'corner', n: corner.n, orig: { ...cropRect }, sx: x, sy: y }; return }
      if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
        draggingRef.current = { type: 'move', orig: { ...cropRect }, sx: x, sy: y }
      } else {
        draggingRef.current = { type: 'new', sx: x, sy: y }
        setCropRect({ x, y, w: 1, h: 1 })
      }
    }
  }

  function handleMove(e) {
    e.preventDefault()
    const d = draggingRef.current
    if (!d) return
    const { x, y } = getCoords(e)
    const canvas = canvasRef.current
    const cw = canvas.width, ch = canvas.height

    if (d.type === 'pt') {
      setRoutePoints(prev => prev.map((p, i) =>
        i === d.idx ? { x: Math.max(0, Math.min(cw, x)), y: Math.max(0, Math.min(ch, y)) } : p
      ))
    } else if (d.type === 'new') {
      setCropRect({ x: Math.min(x, d.sx), y: Math.min(y, d.sy), w: Math.max(10, Math.abs(x - d.sx)), h: Math.max(10, Math.abs(y - d.sy)) })
    } else if (d.type === 'move') {
      const { orig: r } = d
      setCropRect({ x: Math.max(0, Math.min(cw - r.w, r.x + x - d.sx)), y: Math.max(0, Math.min(ch - r.h, r.y + y - d.sy)), w: r.w, h: r.h })
    } else if (d.type === 'corner') {
      const { orig: r, n } = d
      const min = 40
      let nx = r.x, ny = r.y, nw = r.w, nh = r.h
      if (n === 'tl') { nx = Math.min(x, r.x + r.w - min); ny = Math.min(y, r.y + r.h - min); nw = r.x + r.w - nx; nh = r.y + r.h - ny }
      else if (n === 'tr') { ny = Math.min(y, r.y + r.h - min); nw = Math.max(min, x - r.x); nh = r.y + r.h - ny }
      else if (n === 'bl') { nx = Math.min(x, r.x + r.w - min); nw = r.x + r.w - nx; nh = Math.max(min, y - r.y) }
      else { nw = Math.max(min, x - r.x); nh = Math.max(min, y - r.y) }
      setCropRect({ x: Math.max(0, nx), y: Math.max(0, ny), w: Math.min(nw, cw - nx), h: Math.min(nh, ch - ny) })
    }
  }

  function handleUp() { draggingRef.current = null }

  function applyCrop() {
    const img = imgRef.current
    if (!img || !cropRect || cropRect.w < 20 || cropRect.h < 20) return
    const { x, y, w, h } = cropRect
    const tmp = document.createElement('canvas')
    tmp.width = Math.round(w); tmp.height = Math.round(h)
    tmp.getContext('2d').drawImage(img, -Math.round(x), -Math.round(y))
    tmp.toBlob(blob => {
      if (!blob) return
      const newImg = new window.Image()
      newImg.onload = () => {
        imgRef.current = newImg
        const canvas = canvasRef.current
        if (canvas) { canvas.width = Math.round(w); canvas.height = Math.round(h) }
        setRoutePoints(prev => prev.map(p => ({ x: p.x - x, y: p.y - y })))
        setHoldMarkers(prev => prev.map(m => ({ x: m.x - x, y: m.y - y })).filter(m => m.x >= 0 && m.y >= 0 && m.x <= w && m.y <= h))
        setCropRect({ x: 0, y: 0, w, h })
      }
      newImg.src = URL.createObjectURL(blob)
    }, 'image/jpeg', 0.92)
  }

  function resetEditor() {
    const img = origImgRef.current
    if (!img) return
    imgRef.current = img
    const w = img.naturalWidth, h = img.naturalHeight
    const canvas = canvasRef.current
    if (canvas) { canvas.width = w; canvas.height = h }
    setRoutePoints([
      { x: w * 0.5, y: h * 0.88 },
      { x: w * 0.5, y: h * 0.62 },
      { x: w * 0.5, y: h * 0.38 },
      { x: w * 0.5, y: h * 0.12 },
    ])
    setHoldMarkers([])
    setCropRect({ x: 0, y: 0, w, h })
  }

  function getFile() {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current
      const img = imgRef.current
      if (!canvas || !img) { reject(new Error('editor not ready')); return }
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      redraw(true)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('export failed')); return }
        resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
        requestAnimationFrame(() => redraw(false))
      }, 'image/jpeg', 0.88)
    })
  }

  const TOOLS = [
    {
      key: 'route', label: 'Route',
      icon: <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4"><path d="M4 16l4-5 3 3 5-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="4" cy="16" r="2" fill="currentColor"/><circle cx="16" cy="5" r="2" fill="currentColor"/></svg>,
    },
    {
      key: 'holds', label: 'Holds',
      icon: <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="3.5" fill="currentColor" opacity="0.65"/></svg>,
    },
    {
      key: 'crop', label: 'Crop',
      icon: <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4"><path d="M5 2v11h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M2 5h11v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/></svg>,
    },
  ]

  const hint = activeTool === 'route'
    ? 'Drag handles to trace the route. Tap the line to add a point.'
    : activeTool === 'holds'
      ? 'Tap to mark holds. Tap again to remove.'
      : 'Draw or drag to set crop area. Tap Apply to confirm.'

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {TOOLS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTool(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTool === t.key
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={resetEditor}
          className="ml-auto px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden bg-zinc-900">
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ touchAction: 'none', cursor: activeTool === 'holds' ? 'crosshair' : 'default' }}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
          onTouchStart={handleDown}
          onTouchMove={handleMove}
          onTouchEnd={handleUp}
        />
        {!imgRef.current && (
          <div className="absolute inset-0 flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Apply Crop */}
      {activeTool === 'crop' && (
        <button
          type="button"
          onClick={applyCrop}
          className="w-full py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 active:scale-[0.98] transition-all text-zinc-100 font-semibold text-sm"
        >
          Apply Crop
        </button>
      )}

      <p className="text-xs text-zinc-600 text-center pb-1">{hint}</p>
    </div>
  )
}

// ─── Add Climb Sheet ──────────────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function processImageCanvas(file, colorProfile) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)

      const base = hexToRgb(colorProfile.hex_base)
      const light = hexToRgb(colorProfile.hex_light)
      const shadow = hexToRgb(colorProfile.hex_shadow)
      const tol = colorProfile.tolerance ?? 60

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2]
        const dBase = Math.sqrt((r - base.r) ** 2 + (g - base.g) ** 2 + (b - base.b) ** 2)
        const dLight = Math.sqrt((r - light.r) ** 2 + (g - light.g) ** 2 + (b - light.b) ** 2)
        const dShadow = Math.sqrt((r - shadow.r) ** 2 + (g - shadow.g) ** 2 + (b - shadow.b) ** 2)
        if (Math.min(dBase, dLight, dShadow) >= tol) {
          const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
          d[i] = d[i + 1] = d[i + 2] = gray
        }
      }
      ctx.putImageData(imageData, 0, 0)

      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Canvas export failed')); return }
          resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.88
      )
    }
    img.onerror = reject
    img.src = url
  })
}

function AddClimbSheet({ zoneId, zoneDiscipline, onClose, onSaved }) {
  const [color, setColor] = useState('')
  const [grade, setGrade] = useState(GRADE_SCALE[2]) // V1 default
  const [gradePickerKey, setGradePickerKey] = useState(0)
  const [discipline, setDiscipline] = useState(zoneDiscipline || 'Boulder')
  const [tags, setTags] = useState([])
  const [description, setDescription] = useState('')
  const [setDate, setSetDate] = useState(todayISO())
  const [plannedReset, setPlannedReset] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [processedFile, setProcessedFile] = useState(null)
  const [processedPreview, setProcessedPreview] = useState(null)
  const [climbHint, setClimbHint] = useState('')
  const [analyzed, setAnalyzed] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const imageEditorExportRef = useRef(null)

  function toggleTag(tag) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function analyzePhoto() {
    if (!photoFile) return
    setAnalyzing(true)
    try {
      const base64 = await fileToBase64(photoFile)
      const res = await fetch('/api/analyze-climb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, hint: climbHint.trim() }),
      })
      if (!res.ok) return
      const result = await res.json()
      if (result.color && COLOR_OPTIONS.some(o => o.value === result.color)) {
        setColor(result.color)
      }
      if (result.grade && GRADE_SCALE.includes(result.grade)) {
        setGrade(result.grade)
        setGradePickerKey(k => k + 1)
      }
      if (Array.isArray(result.tags)) {
        const validTags = result.tags
          .map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
          .filter(t => TAG_OPTIONS.includes(t))
        setTags(validTags)
      }
      if (result.description) {
        setDescription(result.description)
      }
      if (result.hex_base && result.hex_light && result.hex_shadow) {
        const processed = await processImageCanvas(photoFile, result)
        setProcessedFile(processed)
        setProcessedPreview(URL.createObjectURL(processed))
      }
    } catch {
      // silently fail — setter can fill in manually
    } finally {
      setAnalyzing(false)
      setAnalyzed(true)
    }
  }

  async function handleSave() {
    if (!color) { setError('Please select a hold color.'); return }
    setSaving(true)
    setError(null)

    let photoUrl = null
    let uploadFile = processedFile ?? photoFile
    if (imageEditorExportRef.current?.getFile) {
      try { uploadFile = await imageEditorExportRef.current.getFile() } catch { /* fall back */ }
    }
    if (uploadFile) {
      const ext = uploadFile.name.split('.').pop()
      const path = `${zoneId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('climb-photos')
        .upload(path, uploadFile, { upsert: false })
      if (uploadError) {
        setError(`Photo upload failed: ${uploadError.message}`)
        setSaving(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('climb-photos').getPublicUrl(path)
      photoUrl = publicUrl
    }

    const climbData = {
      zone_id: zoneId,
      grade,
      color,
      tags,
      description: description || null,
      discipline,
      set_date: setDate || null,
      planned_reset_date: plannedReset || null,
      repeat_count: 0,
    }
    if (photoUrl) climbData.photo_url = photoUrl

    const { data, error: insertError } = await insertClimb(climbData)
    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    onSaved(data)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 max-h-[92vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        <div className="px-5 pt-2 pb-3 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-zinc-100">Add Climb</h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-sm">
            Cancel
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-6 flex flex-col gap-6">

          {/* ── Stage 1: no photo yet ── */}
          {!photoFile && (
            <label className="flex flex-col items-center justify-center gap-3 bg-zinc-800 border border-dashed border-zinc-600 rounded-2xl px-4 py-10 cursor-pointer hover:border-zinc-500 transition-colors">
              <span className="text-zinc-400"><PhotoIcon /></span>
              <span className="text-sm font-medium text-zinc-400">Upload climb photo to get started</span>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" />
            </label>
          )}

          {/* ── Stage 2: photo selected, not yet analyzed ── */}
          {photoFile && !analyzed && (
            <div className="flex flex-col gap-3">
              <img src={photoPreview} alt="Preview" className="w-full max-h-52 object-cover rounded-xl" />
              <input
                type="text"
                value={climbHint}
                onChange={e => setClimbHint(e.target.value)}
                placeholder="Describe which climb (e.g. pink holds left side)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition"
              />
              <button
                type="button"
                onClick={analyzePhoto}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all text-white font-semibold text-sm shadow-lg shadow-indigo-900/40"
              >
                Analyze with AI
              </button>
              <button
                type="button"
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); setClimbHint('') }}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-center py-1"
              >
                Remove photo
              </button>
            </div>
          )}

          {/* ── Stage 3: analyzed — tabs ── */}
          {photoFile && analyzed && (
            <>
              {/* Tab bar */}
              <div className="flex rounded-xl bg-zinc-800 p-1 gap-1 shrink-0">
                {[['info', 'Climb Info'], ['edit', 'Image Edit']].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      activeTab === key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Climb Info tab */}
              <div className={activeTab === 'info' ? 'flex flex-col gap-6' : 'hidden'}>
                {/* Processed image + retake */}
                <div className="flex flex-col gap-2">
                  <img src={processedPreview ?? photoPreview} alt="Preview" className="w-full max-h-56 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null); setPhotoPreview(null)
                      setProcessedFile(null); setProcessedPreview(null)
                      setClimbHint(''); setAnalyzed(false); setActiveTab('info')
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-center py-1"
                  >
                    Retake photo
                  </button>
                </div>

                {/* Color */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Hold Color</p>
                  <div className="flex flex-wrap gap-2.5">
                    {COLOR_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setColor(opt.value)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                          color === opt.value ? 'border-zinc-100 scale-105' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: opt.hex }} />
                        <span className={color === opt.value ? 'text-zinc-100' : ''}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grade */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Grade — <span className="normal-case font-bold text-zinc-200">{grade}</span>
                  </p>
                  <GradePicker key={gradePickerKey} value={grade} onChange={setGrade} />
                </div>

                {/* Discipline */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Discipline</p>
                  <div className="flex flex-wrap gap-2">
                    {DISCIPLINE_OPTIONS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDiscipline(d)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          discipline === d ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Style Tags <span className="normal-case font-normal text-zinc-600">(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          tags.includes(tag) ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Description <span className="normal-case font-normal text-zinc-600">(optional)</span>
                  </p>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe the climb…"
                    rows={2}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition resize-none"
                  />
                </div>

                {/* Dates */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Set Date</p>
                    <input
                      type="date"
                      value={setDate}
                      onChange={e => setSetDate(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Reset Date <span className="normal-case font-normal text-zinc-600">(opt)</span>
                    </p>
                    <input
                      type="date"
                      value={plannedReset}
                      onChange={e => setPlannedReset(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Image Edit tab */}
              <div className={activeTab === 'edit' ? 'flex flex-col gap-3' : 'hidden'}>
                <ImageEditor
                  sourceFile={processedFile ?? photoFile}
                  climbColorHex={climbColor(color) || '#6366f1'}
                  visible={activeTab === 'edit'}
                  exportRef={imageEditorExportRef}
                />
              </div>

              {/* Error + Save — always visible */}
              {error && (
                <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</p>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-white font-semibold text-base shadow-lg shadow-indigo-900/40"
              >
                {saving ? 'Saving…' : 'Save Climb'}
              </button>
            </>
          )}

        </div>
      </div>

      {/* Full-screen analyzing spinner */}
      {analyzing && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-zinc-950/90">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-indigo-400 animate-spin" />
          <p className="text-sm font-medium text-zinc-300">Analyzing climb…</p>
        </div>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManageZonePage() {
  const { id } = useParams()
  const router = useRouter()

  const [zone, setZone] = useState(null)
  const [climbs, setClimbs] = useState([])
  const [loading, setLoading] = useState(true)

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showAddSheet, setShowAddSheet] = useState(false)

  const [deletingId, setDeletingId] = useState(null)
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const profile = await fetchUserProfile(user.id)
      if (!profile || (profile.role !== 'setter' && profile.role !== 'admin')) {
        router.replace(`/zone/${id}`)
        return
      }

      const [zoneData, climbData] = await Promise.all([
        fetchZoneById(id),
        fetchClimbsByZone(id),
      ])

      if (zoneData) setZone(zoneData)
      setClimbs(climbData)
      setLoading(false)
    }
    if (id) init()
  }, [id])

  async function handleDeleteClimb(climbId) {
    setDeletingId(climbId)
    const { error } = await deleteClimb(climbId)
    if (!error) {
      setClimbs(prev => prev.filter(c => c.id !== climbId))
      showToast('Climb deleted')
    }
    setDeletingId(null)
  }

  async function handleResetZone() {
    setResetting(true)
    const { error } = await deleteClimbsByZone(id)
    if (!error) {
      setClimbs([])
      showToast('Zone reset — all climbs deleted')
    }
    setResetting(false)
    setShowResetModal(false)
  }

  function handleClimbSaved(newClimb) {
    setClimbs(prev => [...prev, newClimb])
    setShowAddSheet(false)
    showToast('Climb added')
  }

  if (loading) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 text-zinc-100 text-sm font-medium px-4 py-2.5 rounded-full shadow-lg border border-zinc-700 whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push(`/zone/${id}`)}
            className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
            aria-label="Go back"
          >
            <BackIcon />
          </button>
          <h1 className="flex-1 text-base font-semibold text-zinc-100 truncate">
            {zone?.name ?? 'Manage Zone'}
          </h1>
          <span className="text-xs text-zinc-500">{climbs.length} climbs</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 px-4 pt-4 flex flex-col gap-4">

        {/* Reset Zone button */}
        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          className="w-full py-3.5 rounded-2xl bg-rose-600/10 border border-rose-600/30 hover:bg-rose-600/20 active:scale-[0.98] transition-all text-rose-400 font-semibold text-sm"
        >
          Reset Zone
        </button>

        {/* Climb list */}
        {climbs.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm mt-8">No climbs in this zone.</p>
        ) : (
          <ul className="rounded-2xl overflow-hidden border border-zinc-800 divide-y divide-zinc-800">
            {climbs.map(climb => (
              <li key={climb.id} className="flex items-center gap-3 px-4 py-3 bg-zinc-900">
                {/* Color swatch */}
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: climbColor(climb.color) }}
                />
                {/* Grade + tags */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-zinc-100 mr-2">{climb.grade}</span>
                  {(climb.tags ?? []).length > 0 && (
                    <span className="text-xs text-zinc-500">{climb.tags.join(', ')}</span>
                  )}
                </div>
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteClimb(climb.id)}
                  disabled={deletingId === climb.id}
                  className="shrink-0 p-2 text-zinc-600 hover:text-rose-400 active:scale-90 disabled:opacity-40 transition-all rounded-lg hover:bg-rose-400/10"
                  aria-label="Delete climb"
                >
                  {deletingId === climb.id ? (
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-rose-500 animate-spin" />
                  ) : (
                    <TrashIcon />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Climb FAB */}
      <button
        onClick={() => setShowAddSheet(true)}
        className="fixed bottom-6 right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-90 transition-all shadow-lg shadow-indigo-900/50 text-white font-semibold text-sm"
        aria-label="Add climb"
      >
        <PlusIcon />
        Add Climb
      </button>

      {/* Reset confirmation modal */}
      {showResetModal && (
        <ResetConfirmModal
          onCancel={() => setShowResetModal(false)}
          onConfirm={handleResetZone}
          resetting={resetting}
        />
      )}

      {/* Add climb sheet */}
      {showAddSheet && (
        <AddClimbSheet
          zoneId={id}
          zoneDiscipline={zone?.discipline ?? null}
          onClose={() => setShowAddSheet(false)}
          onSaved={handleClimbSaved}
        />
      )}
    </div>
  )
}
