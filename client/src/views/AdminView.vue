<script setup lang="ts">
import DatasetUpdatePanel from '@/components/admin/DatasetUpdatePanel.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useAdminStore } from '@/stores/admin'

const admin = useAdminStore()
</script>

<template>
  <div class="page page-narrow">
    <PageHeader
      title="Admin panel"
      subtitle="Restricted to accounts with the Admin role. Manual trigger for the school dataset pipeline."
    />

    <AlertMessage v-if="admin.message" variant="success">{{ admin.message }}</AlertMessage>

    <DatasetUpdatePanel />
  </div>
</template>
