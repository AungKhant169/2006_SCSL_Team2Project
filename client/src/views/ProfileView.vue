<script setup lang="ts">
import AcademicResultsCard from '@/components/profile/AcademicResultsCard.vue'
import PostalCodeCard from '@/components/profile/PostalCodeCard.vue'
import TargetLevelCard from '@/components/profile/TargetLevelCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useProfileStore } from '@/stores/profile'

const profile = useProfileStore()
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
      <span v-if="profile.status" class="text-[13px] font-semibold text-success" role="status">
        {{ profile.status }}
      </span>
      <BaseButton size="lg" class="text-sm" @click="profile.save()">Save profile</BaseButton>
    </div>
  </div>
</template>
