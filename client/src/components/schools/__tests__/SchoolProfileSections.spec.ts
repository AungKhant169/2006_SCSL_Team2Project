import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { toSchoolProfile } from '@/services/schoolService'
import { makeSchool, SCHOOLS } from '@/test/fixtures'
import { mountWithApp } from '@/test/helpers'
import type { BenchmarkSpec, School, SchoolProfile } from '@/types/school'
import BenchmarkHistory from '../BenchmarkHistory.vue'
import FeeTable from '../FeeTable.vue'
import FinancialSupport from '../FinancialSupport.vue'
import SchoolIdentityCard from '../SchoolIdentityCard.vue'
import SchoolProgrammes from '../SchoolProgrammes.vue'

const profile = (id: number, overrides: Partial<SchoolProfile> = {}): SchoolProfile => ({
  ...toSchoolProfile(SCHOOLS.find((s) => s.id === id)!),
  ...overrides,
})

const T_SCORE: BenchmarkSpec = { format: { kind: 'tScore' }, max: 300 }

describe('SchoolIdentityCard (REQ-1.7, REQ-1.8)', () => {
  it('shows name, governance, tier and flags', async () => {
    const { wrapper } = await mountWithApp(SchoolIdentityCard, { props: { school: profile(5) } })
    expect(wrapper.get('h1').text()).toBe('Raffles Institution')
    const text = wrapper.text()
    expect(text).toContain('Independent')
    expect(text).toContain('Secondary')
    expect(wrapper.findAll('ul li').map((li) => li.text())).toEqual([
      'Autonomous',
      'Integrated Programme',
    ])
    expect(wrapper.find('[aria-label="Raffles Institution badge"], img').exists()).toBe(true)
  })

  it('shows the full address, MRT, bus services, contact details and distance', async () => {
    const { wrapper } = await mountWithApp(SchoolIdentityCard, {
      props: { school: profile(2, { distanceKm: 1.4 }) },
    })
    const items = Object.fromEntries(
      wrapper.findAll('dl > div').map((d) => [d.get('dt').text(), d.get('dd').text()]),
    )
    expect(items).toEqual({
      Address: '2 Example Road, Singapore 100002',
      'Nearest MRT': 'Station 2',
      'Bus services': '20, 21',
      Distance: '1.4 km',
      Principal: 'Mr Lim Example',
      Telephone: '60000002',
      Email: 'school2@moe.edu.sg',
      Website: 'https://school2.example.edu.sg/',
    })
  })

  it('links the website, opening it safely in a new tab', async () => {
    const { wrapper } = await mountWithApp(SchoolIdentityCard, { props: { school: profile(2) } })
    const link = wrapper.get('a[href="https://school2.example.edu.sg/"]')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('shows a website that is not a web address as plain text, never as a link', async () => {
    const { wrapper } = await mountWithApp(SchoolIdentityCard, {
      props: { school: profile(2, { website: 'javascript:alert(1)' }) },
    })
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.text()).toContain('javascript:alert(1)')
  })

  it('asks for a postal code when distance cannot be computed', async () => {
    const { wrapper } = await mountWithApp(SchoolIdentityCard, { props: { school: profile(2) } })
    expect(wrapper.text()).toContain('Add postal code')
  })

  it('says "Not available" for details the dataset lacks', async () => {
    const bare = profile(2, {
      address: '',
      mrt: '',
      bus: '',
      principal: '',
      phone: '',
      email: '',
      website: '',
    })
    const { wrapper } = await mountWithApp(SchoolIdentityCard, { props: { school: bare } })
    const values = wrapper.findAll('dl > div').map((d) => d.get('dd').text())
    expect(values.filter((v) => v === 'Not available')).toHaveLength(7)
  })

  it('offers the bookmark control to signed-in students only', async () => {
    const guest = await mountWithApp(SchoolIdentityCard, { props: { school: profile(2) } })
    expect(guest.wrapper.find('button').exists()).toBe(false)
    const member = await mountWithApp(SchoolIdentityCard, {
      props: { school: profile(2) },
      signedInAs: 'planner2026',
    })
    expect(member.wrapper.get('button').text()).toBe('☆ Save')
  })
})

describe('FeeTable (REQ-1.9, REQ-1.10, BR-1)', () => {
  const fees = (sc: number, pr: number, intl: number) => ({ sc, pr, intl })
  const withCourses = (): School =>
    makeSchool({
      tier: 'uni',
      courses: [
        { name: 'Medicine', field: 'Healthcare', fees: fees(32900, 46700, 71800), miscFee: 0 },
        { name: 'Law', field: 'Arts', fees: fees(0, 0, 0), miscFee: 300 },
      ],
    })
  const rows = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll('tbody tr').map((tr) => tr.findAll('th, td').map((c) => c.text()))

  it('lists every course with its field, tuition and misc. fees', () => {
    const wrapper = mount(FeeTable, { props: { school: withCourses() } })
    expect(rows(wrapper)).toEqual([
      ['Medicine', 'Healthcare', 'S$32,900', '—'],
      ['Law', 'Arts', '—', 'S$300'],
    ])
  })

  it('starts on Singapore Citizen fees and switches across the three tiers', async () => {
    const wrapper = mount(FeeTable, { props: { school: withCourses() } })
    const medicine = () => rows(wrapper).find((r) => r[0] === 'Medicine')![2]
    expect(wrapper.text()).toContain('Fees shown for Singapore Citizen per year.')
    expect(medicine()).toBe('S$32,900')

    const buttons = wrapper.findAll('[aria-label="Citizenship"] button')
    expect(buttons.map((b) => b.text())).toEqual([
      'Singapore Citizen',
      'Permanent Resident',
      'International',
    ])
    await buttons[1]!.trigger('click')
    expect(wrapper.text()).toContain('Fees shown for Permanent Resident per year.')
    expect(medicine()).toBe('S$46,700')
    await buttons[2]!.trigger('click')
    expect(wrapper.text()).toContain('Fees shown for International Student per year.')
    expect(medicine()).toBe('S$71,800')
  })

  it.each([
    ['primary', 'Programmes & fees', 'Programme', 'per month'],
    ['secondary', 'Subject combinations & fees', 'Track / combination', 'per month'],
    ['postsec', 'Courses & fees', 'Course / diploma', 'per year'],
    ['uni', 'Degree programmes & fees', 'Degree', 'per year'],
  ] as const)('a %s school uses the %s wording', (tier, heading, column, unit) => {
    const wrapper = mount(FeeTable, { props: { school: makeSchool({ tier }) } })
    expect(wrapper.get('h2').text()).toBe(heading)
    expect(wrapper.findAll('thead th')[0]!.text()).toBe(column)
    expect(wrapper.text()).toContain(unit)
  })

  it('says "Not available" for a school from the dataset, which carries no fees', () => {
    const wrapper = mount(FeeTable, { props: { school: profile(2) } })
    expect(rows(wrapper)).toEqual([['Not available']])
  })
})

describe('BenchmarkHistory (REQ-1.13)', () => {
  it('shows the figure the dataset has and marks it as the latest', () => {
    const school = makeSchool({
      tier: 'secondary',
      benchmark: T_SCORE,
      history: [{ year: '2017', value: 260 }],
    })
    const wrapper = mount(BenchmarkHistory, { props: { school } })
    const rows = wrapper.findAll('li').map((li) => li.findAll('span').map((s) => s.text()))
    expect(rows).toEqual([['2017', 'T-score ≥ 260']])
    expect(wrapper.text()).toContain('Latest (2017)')
  })

  it('shows several years when there are several', () => {
    const school = makeSchool({
      tier: 'secondary',
      benchmark: T_SCORE,
      history: [
        { year: '2016', value: 240 },
        { year: '2017', value: 260 },
      ],
    })
    const wrapper = mount(BenchmarkHistory, { props: { school } })
    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('Latest (2017)')
  })

  it('draws bars in proportion to the value', () => {
    const school = makeSchool({
      tier: 'secondary',
      benchmark: T_SCORE,
      history: [
        { year: '2016', value: 150 },
        { year: '2017', value: 225 },
      ],
    })
    const widths = mount(BenchmarkHistory, { props: { school } })
      .findAll<HTMLElement>('li [style]')
      .map((el) => Number.parseInt(el.element.style.width))
    expect(widths).toEqual([50, 75])
  })

  it('labels a primary school’s figure as the latest', () => {
    const school = makeSchool({
      tier: 'primary',
      benchmark: { format: { kind: 'places' }, max: 400 },
      history: [{ year: 'Latest', value: 95 }],
    })
    const wrapper = mount(BenchmarkHistory, { props: { school } })
    expect(wrapper.text()).toContain('95 places')
    expect(wrapper.text()).toContain('Places taken up to Phase 2B')
  })

  it('explains the tier’s benchmark', () => {
    const explain = (tier: School['tier']) =>
      mount(BenchmarkHistory, { props: { school: makeSchool({ tier }) } }).text()
    expect(explain('secondary')).toContain('PSLE T-score of the last student posted in 2017')
    expect(explain('postsec')).toContain('L1R5 for Junior Colleges, ELR2B2 for Polytechnics')
    expect(explain('uni')).toContain('polytechnic GPA of the 10th and 90th percentile')
  })

  it('says "Not available" for a school without figures', () => {
    const wrapper = mount(BenchmarkHistory, { props: { school: makeSchool({ tier: 'postsec' }) } })
    expect(wrapper.find('li').exists()).toBe(false)
    expect(wrapper.text()).toContain('Not available')
  })
})

describe('FinancialSupport (REQ-1.11, REQ-1.12)', () => {
  const school = makeSchool({
    aid: [
      { name: 'MOE Tuition Grant', note: 'Subsidises tuition fees' },
      { name: 'Higher Education Bursary', note: 'Up to $2,750/year by household income' },
    ],
    scholarships: [
      {
        name: 'NUS Merit Scholarship',
        source: 'External',
        eligibility: 'Strong A-Level / poly GPA ≥ 3.9; leadership',
      },
    ],
  })

  it('lists financial assistance programmes with their notes', () => {
    const wrapper = mount(FinancialSupport, { props: { school } })
    const aid = wrapper.get('[aria-labelledby="aid-heading"]')
    expect(aid.findAll('li').map((li) => li.get('span').text())).toEqual([
      'MOE Tuition Grant',
      'Higher Education Bursary',
    ])
    expect(aid.text()).toContain('Up to $2,750/year by household income')
  })

  it('lists scholarships with source and explicit eligibility', () => {
    const wrapper = mount(FinancialSupport, { props: { school } })
    const scholarships = wrapper.get('[aria-labelledby="scholarship-heading"]')
    expect(scholarships.text()).toContain('NUS Merit Scholarship')
    expect(scholarships.text()).toContain(
      'Eligibility: Strong A-Level / poly GPA ≥ 3.9; leadership',
    )
    expect(scholarships.text()).toContain('External')
  })

  it('says "Not available" for an empty section (UC-1.2 AF-S3)', () => {
    const wrapper = mount(FinancialSupport, { props: { school: profile(2) } })
    expect(wrapper.findAll('p').map((p) => p.text())).toEqual(['Not available', 'Not available'])
  })
})

describe('SchoolProgrammes', () => {
  it('lists the programmes, subjects and CCAs the school offers', () => {
    const wrapper = mount(SchoolProgrammes, { props: { school: profile(2) } })
    expect(wrapper.get('[aria-labelledby="programmes-heading"]').text()).toContain(
      'Science in Action',
    )
    expect(wrapper.get('[aria-labelledby="programmes-heading"]').text()).toContain(
      'Applied Learning Programme · Sciences',
    )
    expect(wrapper.get('[aria-labelledby="subjects-heading"]').text()).toContain('Subjects (3)')
    expect(
      wrapper
        .get('[aria-labelledby="subjects-heading"]')
        .findAll('li')
        .map((li) => li.text()),
    ).toEqual(['English Language', 'Higher Chinese', 'Mathematics'])
    const ccas = Object.fromEntries(
      wrapper
        .get('[aria-labelledby="ccas-heading"]')
        .findAll('dl > div')
        .map((d) => [d.get('dt').text(), d.get('dd').text()]),
    )
    expect(ccas).toEqual({
      'Clubs and Societies': 'Visual Arts',
      'Visual and Performing Arts': 'Chinese Dance',
    })
  })

  it('lists MOE programmes alongside the school’s own', () => {
    const wrapper = mount(SchoolProgrammes, { props: { school: profile(5) } })
    const programmes = wrapper.get('[aria-labelledby="programmes-heading"]')
    expect(programmes.text()).toContain('Enhanced Music Programme')
    expect(programmes.text()).toContain('MOE programme')
  })

  it('says "Not available" for what the dataset lacks', () => {
    const wrapper = mount(SchoolProgrammes, { props: { school: profile(9, { subjects: [] }) } })
    expect(wrapper.findAll('section section p').map((p) => p.text())).toEqual([
      'Not available',
      'Not available',
      'Not available',
    ])
  })
})
