<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_ATTRIBUTION, MAP_BOUNDS, MAP_MAX_ZOOM, MAP_MIN_ZOOM, MAP_TILE_URL } from '@/data/map'
import type { MapPin } from '@/types/map'

// The caller sets the height with a class, and renders the map only when it has a pin to show.
// Keep the template to a single root element, comments included: a comment next to it makes a
// fragment in development, where the caller's class would then not reach the map.
const props = withDefaults(
  defineProps<{
    pins: MapPin[]
    /** Names the map for assistive technology. */
    label: string
    /** `ai` colours the numbered and school pins purple to match the AI plan's step markers. */
    tone?: 'primary' | 'ai'
  }>(),
  { tone: 'primary' },
)

const svg = (paths: string) =>
  '<svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.2" ' +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
const HOME_ICON = svg('<path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />')
const SCHOOL_ICON = svg(
  '<path d="M2 9l10-5 10 5-10 5-10-5z" /><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" />',
)

// A plan is recomputed whenever any school is described, even when its own pins are unchanged.
// Redrawing then would reset the student's pan and zoom, so only a change of content redraws.
const signature = computed(() => `${props.tone}|${JSON.stringify(props.pins)}`)

const container = ref<HTMLElement | null>(null)
// Leaflet's objects stay out of Vue's reactivity; `draw` brings the map up to date with `pins`.
let map: L.Map | null = null
let layer: L.LayerGroup | null = null

/** A popup is built from DOM nodes, so names and addresses from the server are never read as HTML. */
function popupOf(heading: string, lines: string[]): HTMLElement {
  const root = document.createElement('div')
  const title = document.createElement('strong')
  title.textContent = heading
  root.append(title)
  for (const line of lines) {
    const row = document.createElement('div')
    row.textContent = line
    root.append(row)
  }
  return root
}

function iconOf(pin: MapPin): L.DivIcon {
  const colour =
    pin.mark === 'home' ? 'map-pin-home' : props.tone === 'ai' ? 'map-pin-ai' : 'map-pin-primary'
  const glyph = pin.mark === 'home' ? HOME_ICON : pin.mark === 'school' ? SCHOOL_ICON : pin.mark
  return L.divIcon({
    className: '',
    html: `<span class="map-pin ${colour}">${glyph}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

function draw() {
  if (!map || !layer) return
  layer.clearLayers()
  for (const pin of props.pins) {
    const marker = L.marker(pin.at, {
      icon: iconOf(pin),
      title: pin.label,
      zIndexOffset: pin.mark === 'home' ? 0 : 100,
    })
    marker.bindPopup(popupOf(pin.heading, pin.lines))
    // Leaflet holds a layer back until the map has a view, so the element may not exist yet.
    marker.once('add', () => marker.getElement()?.setAttribute('aria-label', pin.label))
    marker.addTo(layer)
  }

  const points = props.pins.map((pin) => pin.at)
  if (points.length === 1) map.setView(points[0]!, 16)
  else if (points.length > 1) map.fitBounds(points, { padding: [32, 32], maxZoom: 16 })
}

function dispose() {
  map?.remove()
  map = null
  layer = null
}

// The map is created with its element and torn down with it.
watch(
  container,
  (element) => {
    dispose()
    if (!element) return
    map = L.map(element, {
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      maxBounds: MAP_BOUNDS,
      // The page scrolls; a map that swallows the wheel would trap the pointer.
      scrollWheelZoom: false,
      attributionControl: false,
    })
    L.control.attribution({ prefix: false }).addTo(map)
    L.tileLayer(MAP_TILE_URL, {
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      attribution: MAP_ATTRIBUTION,
    }).addTo(map)
    layer = L.layerGroup().addTo(map)
    draw()
  },
  { flush: 'post' },
)

watch(signature, draw)

onBeforeUnmount(dispose)
</script>

<template>
  <div
    ref="container"
    class="location-map isolate w-full overflow-hidden rounded-[10px] border border-line-soft"
    role="region"
    :aria-label="label"
  />
</template>
