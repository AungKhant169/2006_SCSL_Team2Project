<script setup lang="ts">
import RouteJourney from '@/components/home/RouteJourney.vue'
import LinkButton from '@/components/ui/LinkButton.vue'
import { HOME_FEATURES } from '@/data/home'
import { useAuthStore } from '@/stores/auth'
import { useBookmarksStore } from '@/stores/bookmarks'

const auth = useAuthStore()
const bookmarks = useBookmarksStore()
</script>

<template>
  <div>
    <section class="bg-primary-dark px-4 pt-10 pb-8 text-white sm:px-8 sm:pt-14 sm:pb-10">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
        <h1
          class="m-0 text-[clamp(2.25rem,5.4vw,3.6rem)] leading-[1.04] font-extrabold tracking-[-0.035em]"
        >
          Plan your path through Singapore's schools
        </h1>
        <p class="m-0 max-w-[46ch] text-[17px] leading-relaxed text-white/80">
          Compare schools, see what it took to get in, and get a step-by-step roadmap based on your
          results and where you live.
        </p>
      </div>
      <div class="mt-9 sm:mt-12">
        <RouteJourney />
      </div>
    </section>

    <section class="grid gap-8 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[5fr_7fr] lg:gap-16">
      <div>
        <h2 class="m-0 max-w-[24ch] text-[28px] leading-tight font-extrabold tracking-tight">
          Compare schools, then plan the route between them
        </h2>
        <p class="mt-4 mb-0 max-w-[40ch] leading-relaxed text-soft">
          School details are scattered across many sites. PathSG gathers them in one place, from
          official Ministry of Education data.
        </p>
      </div>
      <ul class="m-0 list-none p-0">
        <li
          v-for="feature in HOME_FEATURES"
          :key="feature.title"
          class="border-t border-line py-5 first:pt-0 first:border-t-0 lg:first:border-t lg:first:pt-5"
        >
          <h3 class="m-0 text-xl font-bold tracking-tight">
            <RouterLink :to="feature.to" class="text-ink hover:text-primary">
              {{ feature.title }}
            </RouterLink>
          </h3>
          <p class="mt-1.5 mb-0 max-w-[56ch] leading-relaxed text-soft">{{ feature.body }}</p>
        </li>
      </ul>
    </section>

    <section
      class="grid gap-8 border-t border-line bg-primary-faint px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[5fr_7fr] lg:gap-16"
    >
      <div>
        <h2 class="m-0 max-w-[20ch] text-[28px] leading-tight font-extrabold tracking-tight">
          No real names, birth dates or NRIC numbers
        </h2>
        <p class="mt-4 mb-0 max-w-[44ch] leading-relaxed text-soft">
          An account needs only a username and a password. Your postal code is used to work out how
          far schools are from home, and nothing else.
        </p>
      </div>

      <div class="card flex flex-col items-start gap-4 self-start p-6">
        <template v-if="auth.loggedIn">
          <h3 class="m-0 text-xl font-bold tracking-tight">Welcome back, {{ auth.username }}</h3>
          <p class="m-0 leading-relaxed text-soft">Pick up where you left off.</p>
          <div class="flex flex-wrap gap-2.5">
            <LinkButton :to="{ name: 'roadmap' }">Open roadmap</LinkButton>
            <LinkButton :to="{ name: 'saved' }" variant="outline">
              Saved schools ({{ bookmarks.count }})
            </LinkButton>
            <LinkButton :to="{ name: 'profile' }" variant="outline">My profile</LinkButton>
          </div>
        </template>
        <template v-else>
          <h3 class="m-0 text-xl font-bold tracking-tight">Keep your plans</h3>
          <p class="m-0 leading-relaxed text-soft">
            A free account saves your bookmarks, your results and postal code, and a roadmap.
          </p>
          <LinkButton :to="{ name: 'login' }">Log in or create an account</LinkButton>
        </template>
      </div>

      <p class="m-0 text-[13px] text-muted lg:col-span-2">
        School data: Ministry of Education, via data.gov.sg. Maps: OneMap, Singapore Land Authority.
      </p>
    </section>
  </div>
</template>
