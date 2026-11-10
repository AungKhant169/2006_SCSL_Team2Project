<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDemoSession } from './session'
import { prepareStep } from './prepare'

const demo = useDemoSession()
const router = useRouter()
const route = useRoute()
const rectangle = ref<{ top: number; left: number; width: number; height: number } | null>(null)
const message = ref('')
let target: HTMLElement | null = null
let run = 0
let lastStep = -1
let destination: string | null = null
let observer: ResizeObserver | undefined
let pending: ReturnType<typeof setTimeout> | undefined

function measure() {
  if (!target?.isConnected || demo.state?.paused || !demo.state?.spotlight) {
    rectangle.value = null
    return
  }
  const box = target.getBoundingClientRect()
  const top = Math.max(8, box.top - 8)
  const bottom = Math.min(window.innerHeight - 66, box.bottom + 8)
  rectangle.value =
    bottom > top
      ? {
          top,
          left: Math.max(8, box.left - 8),
          width: Math.min(box.width + 16, window.innerWidth - 16),
          height: bottom - top,
        }
      : null
}

function clearTarget() {
  observer?.disconnect()
  target = null
  rectangle.value = null
}

async function focusStep(version: number, changed: boolean) {
  const currentRun = ++run
  clearTarget()
  clearTimeout(pending)
  if (!demo.state || demo.state.paused || demo.ended) {
    if (demo.state?.paused)
      void demo.acknowledge(version, 'Following paused. Explore the site freely.')
    return
  }
  message.value = ''
  try {
    // Preparation happens only when entering a step, so toggling the spotlight never regenerates a plan.
    const path = changed ? await prepareStep(demo.step) : destination
    if (currentRun !== run) return
    destination = path
    if (path) await router.push(path)
    await nextTick()
    if (currentRun !== run) return
    if (demo.step.route === '/admin' && route.path !== '/admin') {
      throw new Error('Sign in as an administrator on the laptop, then press Refocus.')
    }
    if (demo.step.student && route.path === '/login') {
      throw new Error('Sign in on the laptop, then press Refocus.')
    }
    // School profiles render after an API request. Observe the DOM without blocking newer steps.
    const deadline = Date.now() + 12000
    const findTarget = () => {
      if (currentRun !== run) return
      target = document.querySelector<HTMLElement>(`[data-demo="${demo.step.target}"]`)
      if (!target) {
        if (Date.now() < deadline) pending = setTimeout(findTarget, 120)
        else {
          message.value =
            'Feature is not available on this page. Check the laptop, then press Refocus.'
          void demo.acknowledge(version, message.value)
        }
        return
      }
      const frameTarget = () => {
        if (!target?.isConnected || currentRun !== run) return
        target.scrollIntoView({
          behavior: 'instant',
          block: target.offsetHeight > window.innerHeight - 120 ? 'start' : 'center',
        })
        measure()
      }
      frameTarget()
      // Reframe when an async school profile or generated plan expands after its loading state.
      observer = new ResizeObserver(frameTarget)
      observer.observe(target)
      measure()
      void demo.acknowledge(version, 'Feature ready on the display.')
    }
    findTarget()
  } catch (reason) {
    if (currentRun !== run) return
    lastStep = -1
    message.value =
      reason instanceof Error ? reason.message : 'Check the laptop, then press Refocus.'
    void demo.acknowledge(version, message.value)
  }
}

watch(
  () => demo.state?.version,
  (version) => {
    if (version === undefined) return
    const changed = lastStep !== demo.state!.step
    lastStep = demo.state!.step
    void focusStep(version, changed)
  },
  { immediate: true },
)
watch(
  () => demo.ended,
  (ended) => {
    if (ended) {
      run++
      clearTarget()
      clearTimeout(pending)
    }
  },
)

onMounted(() => {
  window.addEventListener('scroll', measure, true)
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => {
  run++
  clearTimeout(pending)
  clearTarget()
  window.removeEventListener('scroll', measure, true)
  window.removeEventListener('resize', measure)
})
</script>

<template>
  <div
    v-if="rectangle && demo.connected && !demo.ended"
    class="demo-spotlight"
    aria-hidden="true"
    :style="{
      top: `${rectangle.top}px`,
      left: `${rectangle.left}px`,
      width: `${rectangle.width}px`,
      height: `${rectangle.height}px`,
    }"
  />
  <aside class="demo-display-bar" aria-label="Demo display status">
    <span class="demo-live-dot" :class="{ 'is-offline': !demo.connected }" />
    <template v-if="demo.ended"
      ><span>{{ demo.error || 'Demo ended' }}</span
      ><RouterLink to="/demo" @click="demo.detach()">New demo</RouterLink></template
    >
    <template v-else>
      <span>{{
        !demo.connected ? 'Reconnecting…' : demo.state?.paused ? 'Following paused' : 'Live demo'
      }}</span>
      <span class="demo-display-title">{{ demo.step.title }}</span>
      <span v-if="message" class="demo-display-warning" role="status">{{ message }}</span>
      <span class="demo-display-count"
        >{{ (demo.state?.step ?? 0) + 1 }} / {{ demo.state?.step_count }}</span
      >
      <button type="button" @click="demo.detach()">Leave demo</button>
    </template>
  </aside>
</template>
