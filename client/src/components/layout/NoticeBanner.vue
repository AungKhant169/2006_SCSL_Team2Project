<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div v-if="ui.notice" class="alert-warn flex justify-between gap-3" role="status">
    <span>{{ ui.notice }}</span>
    <button type="button" class="border-0 bg-transparent font-semibold" @click="ui.clearNotice()">
      Dismiss
    </button>
  </div>
</template>
