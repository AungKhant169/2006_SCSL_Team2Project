<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_ATTRIBUTION, MAP_BOUNDS, MAP_MAX_ZOOM, MAP_MIN_ZOOM, MAP_TILE_URL } from '@/data/map'
import type { Origin } from '@/services/locationService'
import type { PlanNode } from '@/types/roadmap'

const props = withDefaults(
  defineProps<{
    nodes: PlanNode[]
    /** The centre of the student's postal district. The home pin is left out until it is known. */
    origin: Origin | null
    /** `ai` colours the pins purple to match the AI plan's step markers. */
    tone?: 'primary' | 'ai'
  }>(),
  { tone: 'primary' },
)

type Placed = PlanNode & { latitude: number; longitude: number }
const isPlaced = (node: PlanNode): node is Placed =>
  node.latitude !== null && node.longitude !== null

const placed = computed(() => props.nodes.filter(isPlaced))
const unplaced = computed(() => props.nodes.filter((node) => !isPlaced(node)))

const HOME_ICON =
  '<svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>'

/** What one pin on the map says; kept as plain data so the map can tell when nothing changed. */
interface Pin {
  at: L.LatLngTuple
  home: boolean
  step: number
  /** Names the pin for assistive technology and its tooltip. */
  label: string
  heading: string
  lines: string[]
}

const pins = computed<Pin[]>(() => [
  ...(props.origin
    ? [
        {
          at: [props.origin.latitude, props.origin.longitude] as L.LatLngTuple,
          home: true,
          step: 0,
          label: 'Your postal district',
          heading: 'Your postal district',
          lines: [props.origin.district],
        },
      ]
    : []),
  ...placed.value.map((node) => ({
    at: [node.latitude, node.longitude] as L.LatLngTuple,
    home: false,
    step: node.step,
    label: `${node.label}: ${node.schoolName}`,
    heading: node.schoolName,
    lines: [node.label, node.detail],
  })),
])

// A plan is recomputed whenever any school is described, even when its own pins are unchanged.
// Redrawing then would reset the student's pan and zoom, so only a change of content redraws.
const signature = computed(() => `${props.tone}|${JSON.stringify(pins.value)}`)

const container = ref<HTMLElement | null>(null)
// Leaflet's objects stay out of Vue's reactivity; `draw` brings the map up to date with `pins`.
let map: L.Map | null = null
let layer: L.LayerGroup | null = null

/** A popup is built from DOM nodes, so school names from the server are never read as HTML. */
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

function iconOf(pin: Pin): L.DivIcon {
  const colour = props.tone === 'ai' ? 'map-pin-ai' : 'map-pin-primary'
  return L.divIcon({
    className: '',
    html: pin.home
      ? `<span class="map-pin map-pin-home">${HOME_ICON}</span>`
      : `<span class="map-pin ${colour}">${pin.step}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

function draw() {
  if (!map || !layer) return
  layer.clearLayers()
  for (const pin of pins.value) {
    const marker = L.marker(pin.at, {
      icon: iconOf(pin),
      title: pin.label,
      zIndexOffset: pin.home ? 0 : 100,
    })
    marker.bindPopup(popupOf(pin.heading, pin.lines))
    // Leaflet holds a layer back until the map has a view, so the element may not exist yet.
    marker.once('add', () => marker.getElement()?.setAttribute('aria-label', pin.label))
    marker.addTo(layer)
  }

  const points = pins.value.map((pin) => pin.at)
  if (points.length === 1) map.setView(points[0]!, 16)
  else if (points.length > 1) map.fitBounds(points, { padding: [32, 32], maxZoom: 16 })
}

function dispose() {
  map?.remove()
  map = null
  layer = null
}

// The map element only exists while there is something to show, so it is created and torn down
// with it.
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
  <figure v-if="placed.length > 0" class="flex flex-col gap-2">
    <div
      ref="container"
      class="plan-map isolate h-64 w-full overflow-hidden rounded-[10px] border border-line-soft"
      role="region"
      aria-label="Map of the recommended schools"
    />
    <figcaption class="text-xs text-muted">
      Numbers match the steps above.
      <template v-if="origin">
        The house marks the centre of your postal district, where distances are measured from.
      </template>
      <template v-if="unplaced.length > 0">
        Not shown, as their location is not available:
        {{ unplaced.map((node) => node.label).join(', ') }}.
      </template>
    </figcaption>
  </figure>
</template>
