<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import logo from '@/assets/logo.svg'
import { useAuthStore } from '@/stores/auth'
import { createDemoSession, pairingUrl, useDemoSession } from './session'
import type { Pairing } from './session'
import { DEMO_STEPS } from './script'
import './demo.css'

const route = useRoute()
const router = useRouter()
const demo = useDemoSession()
const pairing = ref<Pairing | null>(null)
const creating = ref(false)
const setupError = ref('')
const qr = ref('')
const publicOrigin = ref(window.location.origin)
const copied = ref(false)
const showEnd = ref(false)
const scriptSize = ref(21)
const elapsed = ref(0)
const scriptPanel = ref<HTMLElement | null>(null)
const role = computed(() => route.params.role as string | undefined)
const isControl = computed(() => role.value === 'control')
const controllerUrl = computed(() =>
  pairing.value ? pairingUrl(pairing.value, 'control', validOrigin.value) : '',
)
const validOrigin = computed(() => {
  try {
    const url = new URL(publicOrigin.value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.origin
      : ''
  } catch {
    return ''
  }
})
const isLocalhost = computed(() => {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(publicOrigin.value).hostname)
  } catch {
    return false
  }
})
const locked = computed(
  () => !demo.connected || demo.busy || demo.ended || !demo.state?.display_connected,
)
const waitingForDisplay = computed(
  () => !!demo.state && demo.state.acknowledged_version < demo.state.version,
)
const remaining = computed(() =>
  Math.ceil(
    DEMO_STEPS.slice((demo.state?.step ?? 0) + 1).reduce((sum, s) => sum + s.seconds, 0) / 60,
  ),
)
const clock = computed(
  () =>
    `${Math.floor(elapsed.value / 60)
      .toString()
      .padStart(2, '0')}:${(elapsed.value % 60).toString().padStart(2, '0')}`,
)
const next = computed(() => DEMO_STEPS[(demo.state?.step ?? 0) + 1])
let clockTimer: ReturnType<typeof setInterval> | undefined
let wakeLock: WakeLockSentinel | null = null
let clockStart = Date.now()
let disposed = false

watch(controllerUrl, async (url) => {
  qr.value = url
    ? await QRCode.toDataURL(url, {
        width: 240,
        margin: 2,
        color: { dark: '#134458', light: '#ffffff' },
      })
    : ''
})
watch(
  () => demo.state?.step,
  () => {
    scriptPanel.value?.scrollTo({ top: 0 })
    if (isControl.value) window.scrollTo({ top: 0, behavior: 'instant' })
    copied.value = false
  },
)

async function create() {
  creating.value = true
  setupError.value = ''
  try {
    pairing.value = await createDemoSession()
  } catch (reason) {
    setupError.value =
      reason instanceof Error ? reason.message : 'Cannot start the demo. Try again.'
  } finally {
    creating.value = false
  }
}

function openDisplay() {
  if (!pairing.value) return
  demo.attach(pairing.value.id, pairing.value.display_key, 'display')
  void router.push('/')
}

async function copy() {
  try {
    await navigator.clipboard.writeText(controllerUrl.value)
    copied.value = true
  } catch {
    setupError.value = 'Select and copy the pairing link below.'
  }
}

async function keepAwake() {
  if (document.visibilityState !== 'visible' || !isControl.value || disposed) return
  try {
    wakeLock = (await navigator.wakeLock?.request('screen')) ?? null
    if (disposed) await wakeLock?.release()
  } catch {
    /* Some phones or battery settings do not allow a screen wake lock. */
  }
}

function onKey(event: KeyboardEvent) {
  if (
    !isControl.value ||
    locked.value ||
    waitingForDisplay.value ||
    demo.state?.paused ||
    /INPUT|SELECT|TEXTAREA|BUTTON/.test((event.target as HTMLElement)?.tagName)
  )
    return
  if (event.key === 'ArrowRight' || event.key === ' ') {
    event.preventDefault()
    void demo.command('next')
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    void demo.command('previous')
  }
}

onMounted(() => {
  const id = route.params.sessionId as string | undefined
  if (role.value && id) {
    demo.attach(id, route.hash.slice(1), role.value === 'display' ? 'display' : 'control')
    if (role.value === 'display' && !demo.ended) {
      void router.replace('/')
      return
    }
    clockStart = Date.now()
    clockTimer = setInterval(() => {
      elapsed.value = Math.floor((Date.now() - clockStart) / 1000)
    }, 1000)
    void keepAwake()
    document.addEventListener('visibilitychange', keepAwake)
    window.addEventListener('keydown', onKey)
  }
})
onBeforeUnmount(() => {
  disposed = true
  clearInterval(clockTimer)
  void wakeLock?.release()
  document.removeEventListener('visibilitychange', keepAwake)
  window.removeEventListener('keydown', onKey)
  if (isControl.value) demo.detach()
})
</script>

<template>
  <div class="demo-shell" :class="{ 'demo-controller': isControl }">
    <header class="demo-masthead">
      <RouterLink to="/demo" class="demo-brand"
        ><img :src="logo" alt="" width="34" height="34" /><span
          >PathSG <span class="demo-brand-sub">Presenter</span></span
        ></RouterLink
      >
      <span v-if="isControl && !demo.ended" class="demo-connection" role="status"
        ><span
          class="demo-live-dot"
          :class="{ 'is-offline': !demo.connected || !demo.state?.display_connected }"
        />{{
          !demo.connected
            ? 'Connecting…'
            : !demo.state?.display_connected
              ? 'Display offline'
              : 'Display connected'
        }}</span
      >
      <RouterLink v-else to="/" class="demo-text-link">Back to PathSG</RouterLink>
    </header>

    <main v-if="!role" class="demo-setup">
      <div class="demo-setup-intro">
        <div class="demo-route-mark" aria-hidden="true"><span /> <i /> <span /> <i /> <span /></div>
        <h1>Your phone is<br />the presentation remote.</h1>
        <p>
          Keep the script in your hand. Take the audience through PathSG, one feature at a time.
        </p>
        <ol class="demo-setup-steps">
          <li>Start a session on the laptop you’re presenting.</li>
          <li>Scan the code with your phone.</li>
          <li>Open the display here. Press Next on your phone.</li>
        </ol>
        <details class="demo-preflight">
          <summary>Before you present</summary>
          <p>
            Use the demo deployment with school data loaded. Both devices must reach the same
            address. OneMap needs internet; AI plans need a server API key.
          </p>
          <p>
            The student section creates a sample account if this browser is signed out. It saves AL
            8, postal 556000, and two bookmarks. Existing signed-in accounts keep their own profile.
            Prepare an admin account for the administrator section.
          </p>
          <p v-if="useAuthStore().loggedIn">
            This display is currently signed in as <strong>{{ useAuthStore().username }}</strong
            >.
          </p>
        </details>
      </div>
      <section class="demo-pairing" aria-label="Pair your phone">
        <template v-if="!pairing"
          ><span class="demo-pairing-symbol" aria-hidden="true">⌁</span>
          <h2>Ready when you are.</h2>
          <p>The phone gets your script and controls. The audience sees only the site.</p>
          <button class="demo-button demo-button-primary" :disabled="creating" @click="create">
            {{ creating ? 'Starting session…' : 'Start demo session' }}
          </button></template
        >
        <template v-else>
          <h2>Pair your phone</h2>
          <p>Scan this code, then open the display below.</p>
          <img
            v-if="qr"
            :src="qr"
            class="demo-qr"
            alt="QR code to open the presenter remote on your phone"
            width="240"
            height="240"
          />
          <label class="demo-field"
            >Address both devices can reach<input
              v-model="publicOrigin"
              type="url"
              placeholder="https://demo.example.com"
              spellcheck="false"
          /></label>
          <p v-if="!validOrigin" class="demo-help-warning">
            Enter a complete http:// or https:// address.
          </p>
          <p v-if="isLocalhost" class="demo-help-warning">
            Your phone cannot reach localhost. Enter this laptop’s Wi-Fi IP address and port, or the
            deployed demo address.
          </p>
          <div class="demo-pairing-actions">
            <button class="demo-button" :disabled="!validOrigin" @click="copy">
              {{ copied ? 'Link copied' : 'Copy phone link' }}</button
            ><a
              v-if="validOrigin"
              :href="controllerUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="demo-text-link"
              >Test remote in a tab</a
            >
          </div>
          <input
            v-if="validOrigin"
            class="demo-link-input"
            aria-label="Phone pairing link"
            :value="controllerUrl"
            readonly
            @focus="($event.target as HTMLInputElement).select()"
          />
          <button class="demo-button demo-button-primary" @click="openDisplay">
            Open audience display
          </button>
          <p class="demo-small">Links expire after 4 hours. Keep the phone link private.</p>
        </template>
        <p v-if="setupError" class="demo-error" role="alert">{{ setupError }}</p>
      </section>
    </main>

    <main v-else-if="demo.ended" class="demo-ended">
      <span class="demo-route-mark" aria-hidden="true">● ── ●</span>
      <h1>{{ demo.error ? 'Let’s reconnect.' : 'That’s a wrap.' }}</h1>
      <p>{{ demo.error || 'The demo session has ended. The site is ready to explore.' }}</p>
      <RouterLink to="/demo" class="demo-button demo-button-primary"
        >Start a new session on the laptop</RouterLink
      >
    </main>

    <main v-else-if="isControl" class="demo-control-main">
      <div
        class="demo-progress-line"
        role="progressbar"
        aria-label="Presentation progress"
        :aria-valuenow="(demo.state?.step ?? 0) + 1"
        :aria-valuemax="DEMO_STEPS.length"
        :aria-valuemin="1"
      >
        <span :style="{ width: `${(((demo.state?.step ?? 0) + 1) / DEMO_STEPS.length) * 100}%` }" />
      </div>
      <div class="demo-step-meta">
        <span>{{ demo.step.chapter }}</span
        ><span
          >{{ (demo.state?.step ?? 0) + 1 }}
          <span class="demo-muted">/ {{ DEMO_STEPS.length }}</span></span
        ><time :aria-label="`${elapsed} seconds elapsed`">{{ clock }}</time>
      </div>
      <div v-if="demo.error" class="demo-error" role="alert">
        {{ demo.error }} {{ !demo.ended ? 'Reconnecting automatically.' : '' }}
      </div>
      <div
        v-else-if="demo.state && !demo.state.display_connected"
        class="demo-status-note"
        role="status"
      >
        Open the audience display on the laptop. Controls will be ready when it connects.
      </div>
      <div
        v-else-if="
          demo.state?.acknowledged_version === demo.state?.version &&
          demo.state?.display_message !== 'Feature ready on the display.'
        "
        class="demo-status-note"
        role="status"
      >
        {{ demo.state?.display_message }}
      </div>
      <div
        v-else-if="demo.state && demo.state.acknowledged_version < demo.state.version"
        class="demo-status-note"
        role="status"
      >
        Bringing the feature into view…
      </div>

      <article
        ref="scriptPanel"
        class="demo-script"
        :style="{ '--demo-script-size': `${scriptSize}px` }"
      >
        <h1>{{ demo.step.title }}</h1>
        <p class="demo-script-copy">{{ demo.step.script }}</p>
        <aside class="demo-cue">
          <span>On the display</span>
          <p>{{ demo.step.cue }}</p>
        </aside>
      </article>
      <div class="demo-up-next">
        <span class="demo-muted">{{ next ? 'Up next' : 'Final step' }}</span
        ><strong>{{ next?.title ?? 'Questions from the audience' }}</strong
        ><span class="demo-muted">{{ remaining }} min left</span>
      </div>
      <details class="demo-run-order">
        <summary>Running order <span>Jump to a feature</span></summary>
        <ol>
          <li v-for="(item, index) in DEMO_STEPS" :key="index">
            <button
              :aria-current="demo.state?.step === index ? 'step' : undefined"
              :disabled="locked || waitingForDisplay || demo.state?.paused"
              @click="demo.command('goto', index)"
            >
              <span>{{ index + 1 }}</span
              ><span
                >{{ item.title }}<small>{{ item.chapter }}</small></span
              ><span v-if="demo.state?.step === index" class="demo-current-mark">●</span>
            </button>
          </li>
        </ol>
      </details>
      <section class="demo-options" aria-label="Presenter settings">
        <div class="demo-font-size">
          <span>Script size</span
          ><button
            aria-label="Smaller script"
            :disabled="scriptSize <= 17"
            @click="scriptSize -= 2"
          >
            A−</button
          ><button aria-label="Larger script" :disabled="scriptSize >= 29" @click="scriptSize += 2">
            A+
          </button>
        </div>
        <button class="demo-text-link" :disabled="locked" @click="demo.command('refocus')">
          Refocus display</button
        ><button
          class="demo-text-link"
          :disabled="locked"
          :aria-pressed="demo.state?.spotlight"
          @click="demo.command('spotlight')"
        >
          Spotlight {{ demo.state?.spotlight ? 'on' : 'off' }}</button
        ><button class="demo-text-link" :disabled="locked" @click="demo.command('restart')">
          Restart demo</button
        ><button class="demo-end-link" @click="showEnd = !showEnd">End session</button>
      </section>
      <div v-if="showEnd" class="demo-end-confirm" role="alert">
        <p>End this demo and disconnect the remote?</p>
        <button class="demo-button" @click="showEnd = false">Keep presenting</button
        ><button class="demo-button demo-button-primary" :disabled="demo.busy" @click="demo.end()">
          End session
        </button>
      </div>
      <footer class="demo-remote-controls">
        <div class="demo-navigation">
          <button
            class="demo-button demo-back"
            :disabled="locked || waitingForDisplay || demo.state?.step === 0 || demo.state?.paused"
            @click="demo.command('previous')"
          >
            <span aria-hidden="true">←</span> Back</button
          ><button
            class="demo-button demo-button-primary demo-next"
            :disabled="locked || waitingForDisplay || !next || demo.state?.paused"
            @click="demo.command('next')"
          >
            {{
              demo.busy
                ? 'Sending…'
                : waitingForDisplay
                  ? 'Preparing feature…'
                  : next
                    ? 'Next feature'
                    : 'Demo complete'
            }}<span aria-hidden="true">→</span>
          </button>
        </div>
        <button
          class="demo-pause"
          :disabled="locked"
          :aria-pressed="demo.state?.paused"
          @click="demo.command('pause')"
        >
          <span aria-hidden="true">{{ demo.state?.paused ? '▶' : 'Ⅱ' }}</span>
          {{ demo.state?.paused ? 'Resume following' : 'Pause following' }}
        </button>
      </footer>
    </main>
    <main v-else class="demo-ended">
      <p role="status">{{ demo.error || 'Opening the audience display…' }}</p>
    </main>
  </div>
</template>
