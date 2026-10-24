import type {
  BenchmarkPoint,
  BenchmarkSpec,
  CcaGroup,
  DirectoryTierId,
  ProgrammeInfo,
  School,
  SchoolProfile,
  TierId,
} from '@/types/school'
import { formatSchoolName, schoolAcronym } from '@/utils/schoolName'
import { ApiError, apiRequest } from './http'

/** What GET /school-api, /bookmark and the roadmap endpoints return for each school. */
export interface SchoolSummaryPayload {
  id: number
  school_key: string
  school_name: string
  address: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  area: string | null
  mrt_desc: string | null
  bus_desc: string | null
  stages: TierId[]
  school_type: string | null
  gendermix: string | null
  psle_2017_cutoff: number | null
  places_taken_phase2b: number | null
}

interface CcaPayload {
  grouping: string
  generic_name: string | null
  customised_name: string | null
}

/** What GET /school-api/{school_key} returns. */
export interface SchoolDetailPayload extends SchoolSummaryPayload {
  url_address: string | null
  telephone_no: string | null
  email_address: string | null
  principal_name: string | null
  sap_ind: string | null
  autonomous_ind: string | null
  gifted_ind: string | null
  ip_ind: string | null
  ib: string | null
  alp_domain: string | null
  alp_title: string | null
  llp_domain1: string | null
  llp_title: string | null
  subjects_list: string[]
  cca_details: CcaPayload[]
  moe_programmes: string[]
}

interface SchoolPage {
  total: number
  items: SchoolSummaryPayload[]
}

/** Largest page the server returns. */
const PAGE_LIMIT = 400

const PLACES_BENCHMARK: BenchmarkSpec = { format: { kind: 'places' }, max: 400 }
const T_SCORE_BENCHMARK: BenchmarkSpec = { format: { kind: 'tScore' }, max: 300 }

function benchmarkOf(tier: DirectoryTierId, school: SchoolSummaryPayload) {
  let spec: BenchmarkSpec | null = null
  let point: BenchmarkPoint | null = null
  // Only primary and secondary schools have entry figures in the dataset.
  if (tier === 'primary' && school.places_taken_phase2b !== null) {
    spec = PLACES_BENCHMARK
    point = { year: 'Latest', value: school.places_taken_phase2b }
  } else if (tier === 'secondary' && school.psle_2017_cutoff !== null) {
    spec = T_SCORE_BENCHMARK
    point = { year: '2017', value: school.psle_2017_cutoff }
  }
  return { benchmark: spec, history: point ? [point] : [] }
}

/** The tier a school is shown under: the one being browsed, else the first stage it covers. */
function tierOf(payload: SchoolSummaryPayload, requested?: DirectoryTierId): DirectoryTierId {
  if (requested) return requested
  const stage = payload.stages.find((s): s is DirectoryTierId => s !== 'preschool')
  return stage ?? 'secondary'
}

export function toSchool(payload: SchoolSummaryPayload, requested?: DirectoryTierId): School {
  const tier = tierOf(payload, requested)
  const name = formatSchoolName(payload.school_name)
  return {
    id: payload.id,
    key: payload.school_key,
    tier,
    acronym: schoolAcronym(name),
    name,
    type: payload.school_type ?? '',
    area: payload.area ?? '',
    address: payload.address ?? '',
    postal: payload.postal_code ?? '',
    mrt: payload.mrt_desc ?? '',
    bus: payload.bus_desc ?? '',
    latitude: payload.latitude,
    longitude: payload.longitude,
    distanceKm: null,
    ...benchmarkOf(tier, payload),
    courses: [],
    aid: [],
    scholarships: [],
  }
}

const yes = (flag: string | null) => ['yes', 'y'].includes((flag ?? '').trim().toLowerCase())

function featuresOf(payload: SchoolDetailPayload): string[] {
  const flags: [string | null, string][] = [
    [payload.autonomous_ind, 'Autonomous'],
    [payload.sap_ind, 'Special Assistance Plan'],
    [payload.gifted_ind, 'Gifted Education Programme'],
    [payload.ip_ind, 'Integrated Programme'],
    [payload.ib, 'IB Diploma'],
  ]
  return flags.filter(([flag]) => yes(flag)).map(([, label]) => label)
}

function programmesOf(payload: SchoolDetailPayload): ProgrammeInfo[] {
  const programmes: ProgrammeInfo[] = []
  if (payload.alp_title) {
    programmes.push({
      kind: 'Applied Learning Programme',
      domain: payload.alp_domain ?? '',
      title: payload.alp_title,
    })
  }
  if (payload.llp_title) {
    programmes.push({
      kind: 'Learning for Life Programme',
      domain: payload.llp_domain1 ?? '',
      title: payload.llp_title,
    })
  }
  return programmes
}

/** CCAs grouped by category; a CCA with a school's own name for it shows that name. */
function ccasOf(details: CcaPayload[]): CcaGroup[] {
  const groups = new Map<string, Set<string>>()
  for (const cca of details) {
    const category = formatSchoolName(cca.generic_name ?? 'Other')
    const names = groups.get(category) ?? new Set<string>()
    names.add(formatSchoolName(cca.customised_name || cca.grouping))
    groups.set(category, names)
  }
  return [...groups]
    .map(([category, names]) => ({ category, names: [...names].sort() }))
    .sort((a, b) => a.category.localeCompare(b.category))
}

export function toSchoolProfile(payload: SchoolDetailPayload): SchoolProfile {
  return {
    ...toSchool(payload),
    website: payload.url_address ?? '',
    phone: payload.telephone_no ?? '',
    email: payload.email_address ?? '',
    principal: payload.principal_name ? formatSchoolName(payload.principal_name) : '',
    gender: payload.gendermix ?? '',
    features: featuresOf(payload),
    programmes: programmesOf(payload),
    moeProgrammes: payload.moe_programmes.map(formatSchoolName),
    subjects: payload.subjects_list,
    ccas: ccasOf(payload.cca_details),
  }
}

/** Every school of a tier, paging through the directory endpoint when there are more than one page. */
export async function fetchSchoolsOfTier(tier: DirectoryTierId): Promise<School[]> {
  const schools: School[] = []
  for (let offset = 0; ; offset += PAGE_LIMIT) {
    const query = new URLSearchParams({
      stage: tier,
      limit: String(PAGE_LIMIT),
      offset: String(offset),
    })
    const page = await apiRequest<SchoolPage>(`/school-api?${query}`)
    schools.push(...page.items.map((item) => toSchool(item, tier)))
    if (page.items.length === 0 || schools.length >= page.total) return schools
  }
}

/** One school's full profile, or null when no school has the key. */
export async function fetchSchoolProfile(key: string): Promise<SchoolProfile | null> {
  try {
    return toSchoolProfile(
      await apiRequest<SchoolDetailPayload>(`/school-api/${encodeURIComponent(key)}`),
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}
