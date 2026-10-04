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

<script lang="ts">
import { defineComponent } from 'vue'

// Interface for backend response typing
interface ApiResponse {
  message: string
  timestamp?: string
}

export default defineComponent({
  name: 'SamplePage',

  data() {
    return {
      backendResponse: null as ApiResponse | null,
      loading: true as boolean,
      error: '' as string,
      apiBaseUrl: import.meta.env.VITE_API_URL as string
    }
  },

  mounted() {
    this.fetchData()
  },

  methods: {
    async fetchData(): Promise<void> {
      this.loading = true
      this.error = ''

      try {
        const response = await fetch(this.apiBaseUrl)
        
        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`)
        }

        const data: ApiResponse = await response.json()
        this.backendResponse = data
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.error = err.message
        } else {
          this.error = 'An unknown error occurred.'
        }
      } finally {
        this.loading = false
      }
    }
  }
})
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