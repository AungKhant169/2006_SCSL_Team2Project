<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import FormField from '@/components/ui/FormField.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { PASSWORD_MAX_LENGTH, USERNAME_MAX_LENGTH, validateCredentials } from '@/utils/credentials'
import type { AuthMode } from '@/utils/credentials'
import PasswordRules from './PasswordRules.vue'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const modes: { value: AuthMode; label: string }[] = [
  { value: 'login', label: 'Log in' },
  { value: 'signup', label: 'Create account' },
]

const mode = ref<AuthMode>('login')
const username = ref('')
const password = ref('')
const error = ref('')

const isSignup = computed(() => mode.value === 'signup')
const title = computed(() => (isSignup.value ? 'Create your account' : 'Welcome back'))
const submitLabel = computed(() => (isSignup.value ? 'Create account' : 'Log in'))

// Any change to the form clears the previous error.
watch([mode, username, password], () => (error.value = ''))

async function submit() {
  error.value = validateCredentials(mode.value, username.value, password.value)
  if (error.value) return

  const name = username.value.trim()
  const failure = isSignup.value
    ? await auth.register(name, password.value)
    : await auth.login(name, password.value)
  if (failure) {
    error.value = failure
    return
  }

  password.value = ''
  // The admin account lands on its panel; everyone else on their profile.
  await router.push({ name: auth.isAdmin ? 'admin' : 'profile' })
  if (isSignup.value) {
    ui.setNotice('Account created. Set your target level and postal code to get started.')
  }
}
</script>

<template>
  <form
    class="card flex w-full max-w-[420px] flex-col gap-[18px] p-7"
    novalidate
    @submit.prevent="submit"
  >
    <SegmentedControl v-model="mode" :options="modes" variant="switch" label="Account mode" />

    <div>
      <h1 class="m-0 text-[22px] font-bold tracking-tight">{{ title }}</h1>
      <p class="page-subtitle">
        Only a username and password. We never collect names, dates of birth or NRIC/FIN.
      </p>
    </div>

    <FormField v-slot="{ id, describedBy }" label="Username" hint="Letters and numbers only.">
      <BaseInput
        :id="id"
        v-model="username"
        :aria-describedby="describedBy"
        :maxlength="USERNAME_MAX_LENGTH"
        autocomplete="username"
        placeholder="e.g. planner2026"
      />
    </FormField>

    <FormField v-slot="{ id }" label="Password">
      <BaseInput
        :id="id"
        v-model="password"
        type="password"
        :maxlength="PASSWORD_MAX_LENGTH"
        :autocomplete="isSignup ? 'new-password' : 'current-password'"
        placeholder="••••••••"
      />
    </FormField>

    <PasswordRules v-if="isSignup" :password="password" />

    <AlertMessage v-if="error">{{ error }}</AlertMessage>

    <BaseButton type="submit" size="lg" :disabled="auth.busy">{{ submitLabel }}</BaseButton>

    <p class="m-0 text-xs leading-normal text-muted">
      Passwords are hashed before storage. Your profile stores only academic parameters and a
      residential postal code.
    </p>
  </form>
</template>
