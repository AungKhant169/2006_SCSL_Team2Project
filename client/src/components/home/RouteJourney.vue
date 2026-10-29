<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import LinkButton from '@/components/ui/LinkButton.vue'
import { getLevel, getTier, isDirectoryTier } from '@/data/education'
import { BROWSE_LABELS, DEFAULT_STOP, ROUTE_STOPS } from '@/data/home'
import type { RouteStop } from '@/data/home'
import { fetchTierCounts } from '@/services/schoolService'
import { useAuthStore } from '@/stores/auth'
import { useDirectoryStore } from '@/stores/directory'
import { useProfileStore } from '@/stores/profile'
import { useRoadmapStore } from '@/stores/roadmap'
import type { DirectoryTierId } from '@/types/school'
import { pluralize } from '@/utils/format'

const auth = useAuthStore()
const directory = useDirectoryStore()
const profile = useProfileStore()
const roadmap = useRoadmapStore()

/** A signed-in student starts on the step their profile targets; everyone else on primary school. */
const origin = ref(
  (auth.loggedIn && ROUTE_STOPS.find((stop) => stop.next === profile.level)?.id) || DEFAULT_STOP,
)

const originIndex = computed(() => ROUTE_STOPS.findIndex((stop) => stop.id === origin.value))
const level = computed(() => getLevel(ROUTE_STOPS[originIndex.value]!.next!))
const tier = computed(() => getTier(level.value.id))
const browseTier = computed(() => (isDirectoryTier(level.value.id) ? level.value.id : null))

/** True while the line draws itself in; afterwards a chosen stop shows its tag straight away. */
const intro = ref(true)
let introTimer: ReturnType<typeof setTimeout> | undefined

const counts = ref<Partial<Record<DirectoryTierId, number>>>({})
onMounted(async () => {
  introTimer = setTimeout(() => (intro.value = false), 1500)
  counts.value = await fetchTierCounts()
})
onBeforeUnmount(() => clearTimeout(introTimer))

function countOf(stop: RouteStop): string {
  const count = stop.tier && counts.value[stop.tier]
  return count ? `${count} ${pluralize(count, 'school')}` : ''
}

function stateOf(index: number) {
  if (index < originIndex.value) return 'past'
  if (index === originIndex.value) return 'here'
  return index === originIndex.value + 1 ? 'next' : 'ahead'
}

function railOf(index: number) {
  if (index < originIndex.value) return 'past'
  return index === originIndex.value ? 'hop' : 'ahead'
}

/** The directory opens on the tier the student is heading for. */
function openDirectory() {
  if (browseTier.value) directory.tier = browseTier.value
}

/** The roadmap opens on the step chosen here, unless it already shows that step. */
function openRoadmap() {
  if (auth.loggedIn && roadmap.stage !== level.value.id) roadmap.selectStage(level.value.id)
}
</script>

<template>
  <div>
    <fieldset class="m-0 min-w-0 border-0 p-0">
      <legend class="mb-4 p-0 text-base font-semibold text-white md:mb-0">
        Where are you now?
      </legend>
      <ol class="route-line" :data-intro="intro || undefined">
        <li
          v-for="(stop, index) in ROUTE_STOPS"
          :key="stop.id"
          class="route-stop"
          :data-state="stateOf(index)"
          :style="{ '--i': index }"
        >
          <label v-if="stop.next" class="route-pick">
            <input
              v-model="origin"
              type="radio"
              name="route-origin"
              class="route-input"
              :value="stop.id"
            />
            <span class="route-dot" aria-hidden="true" />
            <span class="route-text">
              <span class="route-name">{{ stop.name }}</span>
              <span v-if="countOf(stop)" class="route-count">{{ countOf(stop) }}</span>
              <span v-if="index === originIndex" class="route-here">You are here</span>
            </span>
          </label>
          <div v-else class="route-pick">
            <span class="route-dot" aria-hidden="true" />
            <span class="route-text">
              <span class="route-name">{{ stop.name }}</span>
              <span v-if="countOf(stop)" class="route-count">{{ countOf(stop) }}</span>
            </span>
          </div>
          <span
            v-if="index < ROUTE_STOPS.length - 1"
            class="route-rail"
            :data-rail="railOf(index)"
            aria-hidden="true"
          />
        </li>
      </ol>
    </fieldset>

    <div class="mt-7 rounded-xl bg-white p-5 text-ink sm:p-7" aria-live="polite">
      <Transition name="route-swap" mode="out-in">
        <div :key="level.id" class="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-10">
          <div>
            <h2 class="m-0 text-2xl font-extrabold tracking-tight">{{ level.label }}</h2>
            <p class="mt-1 mb-0 text-sm text-muted">{{ level.tag }}</p>
            <dl class="mt-5 mb-0 grid gap-5 sm:grid-cols-2 sm:gap-8">
              <div>
                <dt class="text-[13px] font-semibold text-muted">Your results</dt>
                <dd class="m-0 mt-1 text-[15px] leading-normal">{{ level.hint }}</dd>
              </div>
              <div>
                <dt class="text-[13px] font-semibold text-muted">Schools are compared on</dt>
                <dd class="m-0 mt-1 text-[15px] leading-normal">
                  <b>{{ tier.benchmarkLabel }}</b>
                  <span class="mt-0.5 block text-[13px] text-muted">
                    {{ tier.benchmarkDescription }}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div class="flex flex-col gap-2.5">
            <LinkButton :to="{ name: 'roadmap' }" size="lg" @click="openRoadmap">
              Build my roadmap
            </LinkButton>
            <LinkButton
              v-if="browseTier"
              :to="{ name: 'directory' }"
              variant="outline"
              size="lg"
              @click="openDirectory"
            >
              {{ BROWSE_LABELS[browseTier] }}
            </LinkButton>
            <p v-if="!auth.loggedIn" class="m-0 text-[13px] leading-normal text-muted">
              Roadmaps need an account, so you'll be asked to log in first.
            </p>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
