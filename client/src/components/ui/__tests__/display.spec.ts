import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AlertMessage from '../AlertMessage.vue'
import EmptyState from '../EmptyState.vue'
import PageHeader from '../PageHeader.vue'
import PillBadge from '../PillBadge.vue'
import SectionCard from '../SectionCard.vue'
import SpinnerIcon from '../SpinnerIcon.vue'
import StatTile from '../StatTile.vue'

describe('PillBadge', () => {
  it('renders text with the neutral style by default', () => {
    const wrapper = mount(PillBadge, { slots: { default: 'NYPS' } })
    expect(wrapper.text()).toBe('NYPS')
    expect(wrapper.classes()).toEqual(['pill'])
  })

  it('supports primary / solid variants and the large size', () => {
    expect(mount(PillBadge, { props: { variant: 'primary' } }).classes()).toContain('pill-primary')
    expect(mount(PillBadge, { props: { variant: 'solid' } }).classes()).toContain('pill-solid')
    expect(mount(PillBadge, { props: { size: 'lg' } }).classes()).toContain('pill-lg')
  })
})

describe('AlertMessage', () => {
  it('is an announced danger alert by default', () => {
    const wrapper = mount(AlertMessage, { slots: { default: 'Invalid academic score!' } })
    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.classes()).toContain('alert-danger')
    expect(wrapper.text()).toBe('Invalid academic score!')
  })

  it('has a success variant', () => {
    expect(mount(AlertMessage, { props: { variant: 'success' } }).classes()).toContain(
      'alert-success',
    )
  })
})

describe('EmptyState', () => {
  it('shows the title, message and any actions', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'No roadmap saved yet', message: 'Generate a pathway.' },
      slots: {
        default: '<button>Generate Roadmap</button>',
        icon: '<span data-testid="icon">0</span>',
      },
    })
    expect(wrapper.get('h3').text()).toBe('No roadmap saved yet')
    expect(wrapper.text()).toContain('Generate a pathway.')
    expect(wrapper.find('button').text()).toBe('Generate Roadmap')
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(true)
  })

  it('omits the message paragraph when there is none', () => {
    expect(
      mount(EmptyState, { props: { title: 'Empty' } })
        .find('p')
        .exists(),
    ).toBe(false)
  })
})

describe('SpinnerIcon', () => {
  it('is exposed as a loading status', () => {
    const wrapper = mount(SpinnerIcon)
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-label')).toBe('Loading')
    expect(wrapper.classes()).toContain('animate-spin-slow')
  })

  it('has small and tone variants', () => {
    expect(mount(SpinnerIcon, { props: { size: 'sm' } }).classes()).toContain('size-3.5')
    expect(mount(SpinnerIcon, { props: { tone: 'ai' } }).classes()).toContain('border-t-ai')
    expect(mount(SpinnerIcon, { props: { tone: 'light' } }).classes()).toContain('border-t-white')
  })
})

describe('PageHeader', () => {
  it('renders the title as the page heading with optional subtitle and actions', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Saved institutions', subtitle: 'Distances from 556000.' },
      slots: { default: '<button>Browse directory</button>' },
    })
    expect(wrapper.get('h1').text()).toBe('Saved institutions')
    expect(wrapper.text()).toContain('Distances from 556000.')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('omits the subtitle when not given', () => {
    expect(
      mount(PageHeader, { props: { title: 'Admin panel' } })
        .find('p')
        .exists(),
    ).toBe(false)
  })
})

describe('SectionCard', () => {
  it('renders a titled section with hint and body', () => {
    const wrapper = mount(SectionCard, {
      props: { title: 'School dataset', hint: 'Fetches from data.gov.sg' },
      slots: { default: '<p>body</p>' },
    })
    expect(wrapper.get('h2').text()).toBe('School dataset')
    expect(wrapper.text()).toContain('Fetches from data.gov.sg')
    expect(wrapper.text()).toContain('body')
  })

  it('renders only the body when there is no heading', () => {
    const wrapper = mount(SectionCard, { slots: { default: '<p>body</p>' } })
    expect(wrapper.find('h2').exists()).toBe(false)
  })

  it('allows rich title content and header actions', () => {
    const wrapper = mount(SectionCard, {
      slots: {
        title: 'Reviews <span>(2)</span>',
        actions: '<button>Do</button>',
      },
    })
    expect(wrapper.get('h2').text()).toBe('Reviews (2)')
    expect(wrapper.find('button').text()).toBe('Do')
  })

  it('uses the larger heading style when asked', () => {
    const wrapper = mount(SectionCard, { props: { title: 'Fees', titleSize: 'lg' } })
    expect(wrapper.get('h2').classes()).toContain('section-title-lg')
  })
})

describe('StatTile', () => {
  it('pairs a label with a value', () => {
    const wrapper = mount(StatTile, { props: { label: 'Records in database', value: '2,418' } })
    expect(wrapper.text()).toContain('Records in database')
    expect(wrapper.text()).toContain('2,418')
  })

  it('lets the caller style the value through the slot', () => {
    const wrapper = mount(StatTile, {
      props: { label: 'Status', value: 'Idle' },
      slots: { default: '<span class="text-success">Idle</span>' },
    })
    expect(wrapper.find('.text-success').text()).toBe('Idle')
  })
})
