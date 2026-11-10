import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDemoSession } from '../session'
import { DEMO_STEPS } from '../script'
import { sampleAiPlan } from '../sampleAiPlan'
import { useDirectoryStore } from '@/stores/directory'
import { useRoadmapStore } from '@/stores/roadmap'
import { stubApi } from '@/test/fakeApi'
import { signInAs } from '@/test/helpers'

describe('prepared AI demo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function pair(role: 'display' | 'control') {
    const demo = useDemoSession()
    demo.credentials = { id: 'presentation', key: 'x'.repeat(43), role }
    demo.state = {
      script_id: 'pathsg-v1',
      step_count: DEMO_STEPS.length,
      step: 15,
      version: 0,
      paused: false,
      spotlight: true,
      display_connected: true,
      acknowledged_version: 0,
      display_message: '',
      expires_in: 14400,
    }
    return demo
  }

  it('returns ready sample recommendations without calling a failing AI service', async () => {
    const api = stubApi()
    await signInAs('planner2026')
    api.override('POST /roadmap/generate-ai-roadmap', () => new Response('', { status: 503 }))
    pair('display')
    const roadmap = useRoadmapStore()
    await roadmap.runAi()
    expect(roadmap.aiStatus).toBe('ready')
    expect(roadmap.aiIsSample).toBe(true)
    expect(roadmap.aiPlan).toHaveLength(3)
    expect(api.callsTo('POST /roadmap/generate-ai-roadmap')).toHaveLength(0)
  })

  it('uses actual school IDs, filters the stage and keeps its sample order stable', async () => {
    stubApi()
    const directory = useDirectoryStore()
    const secondary = await directory.loadTier('secondary')
    const primary = await directory.loadTier('primary')
    const catalogue = [...secondary, ...primary]
    const original = catalogue.map((school) => school.id)
    const first = sampleAiPlan('secondary', catalogue)
    const second = sampleAiPlan('secondary', [...catalogue].reverse())
    expect(first.choices).toEqual(second.choices)
    expect(first.schools.every((school) => secondary.some((real) => real.id === school.id))).toBe(
      true,
    )
    expect(catalogue.map((school) => school.id)).toEqual(original)
  })

  it('keeps real AI generation for unpaired visits and the phone controller', async () => {
    const api = stubApi()
    await signInAs('planner2026')
    const roadmap = useRoadmapStore()
    await roadmap.runAi()
    expect(roadmap.aiIsSample).toBe(false)
    pair('control')
    await roadmap.runAi()
    expect(roadmap.aiIsSample).toBe(false)
    expect(api.callsTo('POST /roadmap/generate-ai-roadmap')).toHaveLength(2)
  })

  it('keeps the sample during connection retries, and stops using it after the demo ends', async () => {
    const api = stubApi()
    await signInAs('planner2026')
    const demo = pair('display')
    demo.connected = false
    const roadmap = useRoadmapStore()
    await roadmap.runAi()
    expect(roadmap.aiIsSample).toBe(true)
    expect(api.callsTo('POST /roadmap/generate-ai-roadmap')).toHaveLength(0)
    demo.ended = true
    await roadmap.runAi()
    expect(roadmap.aiIsSample).toBe(false)
    expect(api.callsTo('POST /roadmap/generate-ai-roadmap')).toHaveLength(1)
  })
})
