<script setup lang="ts">
import BaseInput from '@/components/ui/BaseInput.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { useProfileStore } from '@/stores/profile'

const profile = useProfileStore()
</script>

<template>
  <SectionCard
    hint="Default reference point for all distance calculations, and required before generating a roadmap."
  >
    <template #title>
      Residential postal code <span class="text-danger" aria-hidden="true">*</span>
    </template>
    <div class="flex flex-wrap items-center gap-3">
      <BaseInput
        :model-value="profile.postal"
        class="w-[140px] text-base tracking-[0.08em]"
        maxlength="6"
        inputmode="numeric"
        placeholder="6 digits"
        aria-label="Residential postal code"
        autocomplete="postal-code"
        @update:model-value="profile.setPostal"
      />
      <span class="text-[13px]" :class="profile.postalValid ? 'text-success' : 'text-muted'">
        {{ profile.postalValid ? 'Valid Singapore postal code' : 'Required · 6 digits' }}
      </span>
    </div>
  </SectionCard>
</template>
