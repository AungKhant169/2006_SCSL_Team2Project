import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { getSchool } from '@/data/schools'
import type { School } from '@/types/school'
import { mountWithApp } from '@/test/helpers'
import BenchmarkHistory from '../BenchmarkHistory.vue'
import FeeTable from '../FeeTable.vue'
import FinancialSupport from '../FinancialSupport.vue'
import SchoolIdentityCard from '../SchoolIdentityCard.vue'

const school = (id: number) => getSchool(id)!

describe('SchoolIdentityCard (REQ-1.7, REQ-1.8)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows name, acronym, governance and tier', async () => {
    const { wrapper } = await mountWithApp(SchoolIdentityCard, {
      props: { school: school(2), hasPostal: true },
    })
    expect(wrapper.get('h1').text()).toBe('Rosyth School')
    const text = wrapper.text()
    expect(text).toContain('RS')
    expect(text).toContain('Government')
    expect(text).toContain('Primary')
    expect(wrapper.get('img').attributes('alt')).toBe('Rosyth School badge')
  })

  it('shows the full address with postal code, MRT, bus stop and distance', async () => {
    const { wrapper } = await mountWithApp(SchoolIdentityCard, {
      props: { school: school(15), hasPostal: true },
    })
    const items = Object.fromEntries(
      wrapper.findAll('dl > div').map((d) => [d.get('dt').text(), d.get('dd').text()]),
    )
    expect(items).toEqual({
      Address: '50 Nanyang Avenue, Singapore 639798',
      'Nearest MRT': 'Pioneer (EW28)',
      'Nearest bus stop': 'Lee Wee Nam Lib (Stop 27211)',
      Distance: '20.3 km',
    })
  })

  it('asks for a postal code when distance cannot be computed', async () => {
    const { wrapper } = await mountWithApp(SchoolIdentityCard, {
      props: { school: school(2), hasPostal: false },
    })
    expect(wrapper.text()).toContain('Add postal code')
  })

  it('offers the bookmark control to signed-in students only', async () => {
    const guest = await mountWithApp(SchoolIdentityCard, {
      props: { school: school(2), hasPostal: true },
    })
    expect(guest.wrapper.find('button').exists()).toBe(false)
    const member = await mountWithApp(SchoolIdentityCard, {
      props: { school: school(2), hasPostal: true },
      signedInAs: 'planner2026',
    })
    expect(member.wrapper.get('button').text()).toBe('★ Saved')
  })
})

describe('FeeTable (REQ-1.9, REQ-1.10, BR-1)', () => {
  const rows = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll('tbody tr').map((tr) => tr.findAll('th, td').map((c) => c.text()))

  it('lists every course with its field, tuition and misc. fees', () => {
    const wrapper = mount(FeeTable, { props: { school: school(9) } })
    expect(rows(wrapper)).toEqual([
      ['Diploma in Computer Science', 'STEM', 'S$3,100', 'S$300'],
      ['Diploma in Business Administration', 'Business', 'S$3,100', 'S$300'],
      ['Diploma in Optometry', 'Healthcare', 'S$3,100', 'S$300'],
      ['Diploma in Mechanical Engineering', 'STEM', 'S$3,100', 'S$300'],
    ])
  })

  it('starts on Singapore Citizen fees and switches across the three tiers', async () => {
    const wrapper = mount(FeeTable, { props: { school: school(14) } })
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

  it('shows a dash for fees that do not apply', () => {
    const wrapper = mount(FeeTable, { props: { school: school(1) } })
    expect(rows(wrapper)[1]).toEqual(['Higher Chinese', 'Languages', '—', '—'])
  })

  it.each([
    [2, 'Programmes & fees', 'Programme', 'per month'],
    [5, 'Subject combinations & fees', 'Track / combination', 'per month'],
    [9, 'Courses & fees', 'Course / diploma', 'per year'],
    [14, 'Degree programmes & fees', 'Degree', 'per year'],
  ])('school %i uses the %s wording', (id, heading, column, unit) => {
    const wrapper = mount(FeeTable, { props: { school: school(id) } })
    expect(wrapper.get('h2').text()).toBe(heading)
    expect(wrapper.findAll('thead th')[0]!.text()).toBe(column)
    expect(wrapper.text()).toContain(unit)
  })

  it('says "Not available" when a school lists no courses', () => {
    const empty: School = { ...school(2), courses: [] }
    expect(mount(FeeTable, { props: { school: empty } }).text()).toContain('Not available')
  })
})

describe('BenchmarkHistory (REQ-1.13)', () => {
  it('shows four years of benchmarks and the latest value', () => {
    const wrapper = mount(BenchmarkHistory, { props: { school: school(5) } })
    const rows = wrapper.findAll('li').map((li) => li.findAll('span').map((s) => s.text()))
    expect(rows).toEqual([
      ['2022', 'AL 4 – 6'],
      ['2023', 'AL 4 – 6'],
      ['2024', 'AL 4 – 7'],
      ['2025', 'AL 4 – 6'],
    ])
    expect(wrapper.text()).toContain('Latest (2025)')
    expect(wrapper.text()).toContain('AL 4 – 6')
  })

  it('draws bars that reflect selectivity: lower PSLE AL cut-offs fill more', () => {
    const wrapper = mount(BenchmarkHistory, { props: { school: school(7) } })
    const widths = wrapper
      .findAll<HTMLElement>('li [style]')
      .map((el) => Number.parseInt(el.element.style.width))
    expect(widths).toEqual([59, 63, 63, 66])
  })

  it('explains the tier’s benchmark', () => {
    expect(mount(BenchmarkHistory, { props: { school: school(2) } }).text()).toContain(
      'Applicants per vacancy at Phase 2C',
    )
    expect(mount(BenchmarkHistory, { props: { school: school(11) } }).text()).toContain(
      'L1R5 for Junior Colleges, ELR2B2 for Polytechnics',
    )
    expect(mount(BenchmarkHistory, { props: { school: school(14) } }).text()).toContain(
      'polytechnic GPA of the 10th and 90th percentile',
    )
  })

  it('uses the right scale per tier', () => {
    expect(mount(BenchmarkHistory, { props: { school: school(11) } }).text()).toContain('L1R5 ≤ 5')
    expect(mount(BenchmarkHistory, { props: { school: school(9) } }).text()).toContain('ELR2B2 ≤ 8')
    expect(mount(BenchmarkHistory, { props: { school: school(15) } }).text()).toContain(
      '3.75 – 3.98',
    )
  })
})

describe('FinancialSupport (REQ-1.11, REQ-1.12)', () => {
  it('lists financial assistance programmes with their notes', () => {
    const wrapper = mount(FinancialSupport, { props: { school: school(9) } })
    const aid = wrapper.get('[aria-labelledby="aid-heading"]')
    expect(aid.findAll('li').map((li) => li.get('span').text())).toEqual([
      'MOE Tuition Grant',
      'Higher Education Bursary',
      'CDC/CCC Polytechnic Bursary',
    ])
    expect(aid.text()).toContain('Up to $2,750/year by household income')
  })

  it('lists scholarships with source and explicit eligibility', () => {
    const wrapper = mount(FinancialSupport, { props: { school: school(14) } })
    const scholarships = wrapper.get('[aria-labelledby="scholarship-heading"]')
    expect(scholarships.text()).toContain('NUS Merit Scholarship')
    expect(scholarships.text()).toContain(
      'Eligibility: Strong A-Level / poly GPA ≥ 3.9; leadership',
    )
    expect(scholarships.text()).toContain('External')
  })

  it('says "Not available" for an empty section (UC-1.2 AF-S3)', () => {
    const bare: School = { ...school(2), aid: [], scholarships: [] }
    const wrapper = mount(FinancialSupport, { props: { school: bare } })
    expect(wrapper.findAll('p').map((p) => p.text())).toEqual(['Not available', 'Not available'])
  })
})
