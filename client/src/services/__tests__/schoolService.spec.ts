import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHOOLS } from '@/test/fixtures'
import { ApiError, apiRequest } from '../http'
import {
  fetchSchoolProfile,
  fetchSchoolsOfTier,
  fetchTierCounts,
  toSchool,
  toSchoolProfile,
} from '../schoolService'

vi.mock('../http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../http')>()),
  apiRequest: vi.fn(),
}))
const request = vi.mocked(apiRequest)

const school = (id: number) => SCHOOLS.find((s) => s.id === id)!
const nanyang = school(1)
const rosyth = school(2)
const raffles = school(5)
const temasek = school(9)

describe('toSchool', () => {
  it('maps a server school to the directory model, in title case', () => {
    expect(toSchool(nanyang, 'primary')).toMatchObject({
      id: 1,
      key: 'nanyang primary',
      tier: 'primary',
      name: 'Nanyang Primary School',
      acronym: 'NP',
      type: 'Government-Aided',
      area: 'Hougang',
      address: '1 Example Road',
      postal: '100001',
      mrt: 'Station 1',
      bus: '10, 11',
      distanceKm: null,
    })
  })

  it('uses the places taken as the primary benchmark', () => {
    const mapped = toSchool(nanyang, 'primary')
    expect(mapped.benchmark).toEqual({ format: { kind: 'places' }, max: 400 })
    expect(mapped.history).toEqual([{ year: 'Latest', value: 120 }])
  })

  it('uses the 2017 T-score cut-off as the secondary benchmark', () => {
    const mapped = toSchool(raffles, 'secondary')
    expect(mapped.benchmark).toEqual({ format: { kind: 'tScore' }, max: 300 })
    expect(mapped.history).toEqual([{ year: '2017', value: 260 }])
  })

  it('has no benchmark where the dataset has none', () => {
    expect(toSchool(temasek, 'postsec')).toMatchObject({ benchmark: null, history: [] })
    // A school that spans stages shows the benchmark of the tier it is listed under.
    expect(toSchool(raffles, 'postsec')).toMatchObject({ benchmark: null, history: [] })
  })

  it('falls back to the first stage the school covers when no tier is given', () => {
    expect(toSchool(raffles).tier).toBe('secondary')
  })

  it('leaves fees, financial aid and scholarships to the profile', () => {
    expect(toSchool(nanyang)).toMatchObject({ courses: [], aid: [], scholarships: [] })
  })

  it('tolerates missing optional fields', () => {
    const bare = {
      ...nanyang,
      address: null,
      postal_code: null,
      area: null,
      mrt_desc: null,
      bus_desc: null,
      school_type: null,
      latitude: null,
      longitude: null,
    }
    expect(toSchool(bare, 'primary')).toMatchObject({
      address: '',
      postal: '',
      area: '',
      mrt: '',
      bus: '',
      type: '',
      latitude: null,
    })
  })
})

describe('toSchoolProfile', () => {
  it('adds contact details, flags, programmes, subjects and grouped CCAs', () => {
    const profile = toSchoolProfile(rosyth)
    expect(profile).toMatchObject({
      name: 'Rosyth School',
      website: 'https://school2.example.edu.sg/',
      phone: '60000002',
      email: 'school2@moe.edu.sg',
      principal: 'Mr Lim Example',
      features: ['Gifted Education Programme'],
      subjects: ['English Language', 'Higher Chinese', 'Mathematics'],
    })
    expect(profile.programmes).toEqual([
      { kind: 'Applied Learning Programme', domain: 'Sciences', title: 'Science in Action' },
    ])
    expect(profile.ccas).toEqual([
      { category: 'Clubs and Societies', names: ['Visual Arts'] },
      { category: 'Visual and Performing Arts', names: ['Chinese Dance'] },
    ])
  })

  it('maps the programmes with their fees, the aid and the scholarships', () => {
    const profile = toSchoolProfile({
      ...rosyth,
      programmes: [
        {
          name: 'All full-time diploma courses',
          field: 'Total payable per year',
          fee_sc: 3177.52,
          fee_pr: 6507.52,
          fee_intl: 13767.99,
          misc_fee: null,
        },
      ],
      financial_aid: [{ name: 'MOE Financial Assistance Scheme (FAS)', note: null }],
      scholarships: [{ name: 'Gold Scholarship', source: 'School', eligibility: 'Top students' }],
    })
    expect(profile.courses).toEqual([
      {
        name: 'All full-time diploma courses',
        field: 'Total payable per year',
        fees: { sc: 3177.52, pr: 6507.52, intl: 13767.99 },
        miscFee: 0,
      },
    ])
    expect(profile.aid).toEqual([{ name: 'MOE Financial Assistance Scheme (FAS)', note: '' }])
    expect(profile.scholarships).toEqual([
      { name: 'Gold Scholarship', source: 'School', eligibility: 'Top students' },
    ])
  })

  it('lists every flag the school has', () => {
    expect(toSchoolProfile(raffles).features).toEqual(['Autonomous', 'Integrated Programme'])
    expect(toSchoolProfile(raffles).moeProgrammes).toEqual(['Enhanced Music Programme'])
  })
})

describe('fetchSchoolsOfTier', () => {
  beforeEach(() => request.mockReset())

  it('asks for the tier’s schools by stage and maps them', async () => {
    request.mockResolvedValue({ total: 2, items: [nanyang, rosyth] })
    const schools = await fetchSchoolsOfTier('primary')
    expect(request).toHaveBeenCalledWith('/school-api?stage=primary&limit=400&offset=0')
    expect(schools.map((s) => s.name)).toEqual(['Nanyang Primary School', 'Rosyth School'])
    expect(schools.every((s) => s.tier === 'primary')).toBe(true)
  })

  it('keeps asking until it has every page', async () => {
    request
      .mockResolvedValueOnce({ total: 3, items: [nanyang, rosyth] })
      .mockResolvedValueOnce({ total: 3, items: [raffles] })
    const schools = await fetchSchoolsOfTier('secondary')
    expect(request).toHaveBeenNthCalledWith(2, '/school-api?stage=secondary&limit=400&offset=400')
    expect(schools).toHaveLength(3)
  })

  it('stops on an empty page even if the total promises more', async () => {
    request
      .mockResolvedValueOnce({ total: 5, items: [nanyang] })
      .mockResolvedValueOnce({ total: 5, items: [] })
    expect(await fetchSchoolsOfTier('primary')).toHaveLength(1)
  })

  it('returns nothing for a tier with no schools', async () => {
    request.mockResolvedValue({ total: 0, items: [] })
    expect(await fetchSchoolsOfTier('uni')).toEqual([])
  })
})

describe('fetchSchoolProfile', () => {
  beforeEach(() => request.mockReset())

  it('reads the school by its key, escaping it for the address', async () => {
    request.mockResolvedValue(rosyth)
    const profile = await fetchSchoolProfile('st gabriel s secondary')
    expect(request).toHaveBeenCalledWith('/school-api/st%20gabriel%20s%20secondary')
    expect(profile?.name).toBe('Rosyth School')
  })

  it('is null when no school has the key', async () => {
    request.mockRejectedValueOnce(new ApiError(404, 'This school could not be found.'))
    expect(await fetchSchoolProfile('nowhere')).toBeNull()
  })

  it('passes other failures on', async () => {
    request.mockRejectedValueOnce(new ApiError(500, 'oops'))
    await expect(fetchSchoolProfile('rosyth')).rejects.toMatchObject({ status: 500 })
  })
})

describe('fetchTierCounts', () => {
  beforeEach(() => {
    request.mockReset()
  })

  it('reads each directory tier’s total from a one-school page', async () => {
    request.mockImplementation(async (path: string) => {
      const totals: Record<string, number> = { primary: 180, secondary: 135, postsec: 40, uni: 6 }
      return { total: totals[new URL(path, 'http://x').searchParams.get('stage')!], items: [] }
    })
    expect(await fetchTierCounts()).toEqual({ primary: 180, secondary: 135, postsec: 40, uni: 6 })
    expect(request).toHaveBeenCalledWith('/school-api?stage=primary&limit=1')
    expect(request).toHaveBeenCalledTimes(4)
  })

  it('leaves out a tier that fails and keeps the rest', async () => {
    request.mockImplementation(async (path: string) => {
      if (path.includes('stage=secondary')) throw new ApiError(500, 'Server error')
      return { total: 7, items: [] }
    })
    expect(await fetchTierCounts()).toEqual({ primary: 7, postsec: 7, uni: 7 })
  })
})
