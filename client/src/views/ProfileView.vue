<script setup lang="ts">
import { useRouter } from 'vue-router'
import AcademicResultsCard from '@/components/profile/AcademicResultsCard.vue'
import PostalCodeCard from '@/components/profile/PostalCodeCard.vue'
import TargetLevelCard from '@/components/profile/TargetLevelCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'

const profile = useProfileStore()
const ui = useUiStore()
const router = useRouter()

/** A saved profile leads straight on to the roadmap, with a toast to confirm it went through. */
async function save() {
  if (!(await profile.save())) return
  await router.push({ name: 'roadmap' })
  ui.showToast('Profile saved successfully')
}
</script>

<template>
  <div class="page page-narrow">
    <PageHeader
      title="My profile"
      subtitle="Academic parameters and location. No personal identifiers are stored."
    />

    <PostalCodeCard />
    <TargetLevelCard />
    <AcademicResultsCard />

    <div class="flex flex-wrap items-center justify-end gap-2.5">
      <BaseButton size="lg" class="text-sm" :disabled="profile.saving" @click="save">
        Save profile
      </BaseButton>
    </div>
  </div>
</template>
