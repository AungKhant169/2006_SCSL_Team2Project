<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import FormField from '@/components/ui/FormField.vue'
import { DISTANCE_OPTIONS, FIELD_OPTIONS, GOVERNANCE_OPTIONS } from '@/data/education'
import { useAuthStore } from '@/stores/auth'
import { useDirectoryStore } from '@/stores/directory'

const directory = useDirectoryStore()
const auth = useAuthStore()

const governanceOptions = GOVERNANCE_OPTIONS.map((value) => ({ value, label: value }))

const postalHint = computed(() => {
  if (!directory.hasPostal) return 'Please enter a valid 6-digit Singapore postal code.'
  return auth.loggedIn
    ? 'Using your saved residential postal code.'
    : 'Reference postal code for distances.'
})
</script>

<template>
  <section class="card flex flex-col gap-2.5 px-4 py-3.5" aria-label="Search and filters">
    <div class="flex flex-wrap items-end gap-2.5">
      <FormField
        v-slot="{ id, describedBy, invalid }"
        label="Keyword"
        caps
        class="flex-[2_1_240px]"
        :error="directory.queryError"
      >
        <BaseInput
          :id="id"
          v-model="directory.query"
          :aria-describedby="describedBy"
          :invalid="invalid"
          placeholder="Name, acronym or course (min. 2 characters)"
        />
      </FormField>

      <FormField v-slot="{ id }" label="Governance" caps class="flex-[1_1_160px]">
        <BaseSelect :id="id" v-model="directory.gov" :options="governanceOptions" />
      </FormField>

      <FormField
        v-if="directory.isTertiary"
        v-slot="{ id }"
        label="Field of study"
        caps
        class="flex-[1_1_160px]"
      >
        <BaseSelect :id="id" v-model="directory.field" :options="FIELD_OPTIONS" />
      </FormField>

      <div class="field flex-[1_1_220px]">
        <span class="field-label-caps" id="distance-label">Distance from postal code</span>
        <div class="flex gap-2" role="group" aria-labelledby="distance-label">
          <BaseInput
            :model-value="directory.postal"
            class="w-[90px]"
            maxlength="6"
            inputmode="numeric"
            placeholder="Postal"
            aria-label="Postal code"
            @update:model-value="directory.setPostal"
          />
          <BaseSelect
            v-model="directory.distance"
            class="flex-1"
            aria-label="Distance"
            :options="DISTANCE_OPTIONS"
          />
        </div>
      </div>

      <BaseButton
        variant="outline-primary"
        class="whitespace-nowrap"
        @click="directory.resetFilters()"
      >
        Reset all
      </BaseButton>
    </div>

    <p class="m-0 flex flex-wrap gap-x-4 text-xs text-muted">
      <span>{{ postalHint }}</span>
      <span v-if="!auth.loggedIn">
        <RouterLink :to="{ name: 'login' }">Log in</RouterLink> to use your saved residential postal
        code automatically.
      </span>
    </p>
  </section>
</template>
