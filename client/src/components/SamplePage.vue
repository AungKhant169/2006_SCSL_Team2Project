<template>
  <div class="sample-page">
    <h1>Backend Connection Test</h1>

    <div v-if="loading">Testing connection...</div>

    <div v-else-if="error" class="error-message">
      <p>⚠️ Failed to connect: {{ error }}</p>
      <button @click="fetchData">Retry</button>
    </div>

    <div v-else class="success-message">
      <p><strong>Response from backend:</strong></p>
      <pre>{{ backendResponse }}</pre>
      <button @click="fetchData">Refetch Data</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

// Interface for backend response typing
interface ApiResponse {
  message: string
  timestamp?: string
}

const backendResponse = ref<ApiResponse | null>(null)
const loading = ref(true)
const error = ref('')
const apiBaseUrl = import.meta.env.VITE_API_URL as string

async function fetchData(): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch(apiBaseUrl)

    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`)
    }

    const data: ApiResponse = await response.json()
    backendResponse.value = data
  } catch (err: unknown) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'An unknown error occurred.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.sample-page {
  max-width: 600px;
  margin: 0 auto;
}
.error-message {
  color: #dc3545;
  background-color: #f8d7da;
  padding: 1rem;
  border-radius: 4px;
}
.success-message {
  color: #155724;
  background-color: #d4edda;
  padding: 1rem;
  border-radius: 4px;
}
pre {
  background: #ffffff;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-align: left;
}
button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>