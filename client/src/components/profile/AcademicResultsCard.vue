<script setup lang="ts">
import { computed } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import FormField from '@/components/ui/FormField.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { PRIMARY_RESULT_OPTIONS, RESULT_FIELDS } from '@/data/education'
import { useProfileStore } from '@/stores/profile'

const profile = useProfileStore()

/** Only the result fields relevant to the chosen target level are rendered (REQ-2.7). */
const fields = computed(() => RESULT_FIELDS[profile.level] ?? [])
</script>

<template>
  <SectionCard title="Previous academic results" :hint="profile.levelInfo.hint">
    <p v-if="profile.level === 'preschool'" class="m-0 text-[13px] text-muted">
      No academic results are collected for preschool placement.
    </p>

    <div v-else-if="profile.level === 'primary'" class="flex flex-wrap gap-2.5">
      <button
        v-for="option in PRIMARY_RESULT_OPTIONS"
        :key="option"
        type="button"
        class="toggle-chip"
        :class="{ 'toggle-chip-active': profile.primaryResult === option }"
        :aria-pressed="profile.primaryResult === option"
        @click="profile.primaryResult = option"
      >
        {{ option }}
      </button>
    </div>

    <div
      v-else
      class="grid gap-3.5"
      :class="
        fields.length > 1
          ? 'grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))]'
          : 'max-w-[320px]'
      "
    >
      <FormField
        v-for="field in fields"
        :key="field.key"
        v-slot="{ id, describedBy }"
        :label="field.label"
        :hint="field.hint"
      >
        <BaseInput
          :id="id"
          v-model="profile[field.key]"
          :aria-describedby="describedBy"
          :inputmode="field.inputmode"
          :placeholder="field.placeholder"
        />
      </FormField>
    </div>

    <AlertMessage v-if="profile.error">{{ profile.error }}</AlertMessage>
  </SectionCard>
</template>
