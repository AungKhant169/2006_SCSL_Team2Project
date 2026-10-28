import { toSchool } from '@/services/schoolService'
import type { SchoolDetailPayload } from '@/services/schoolService'
import type { DirectoryTierId, School } from '@/types/school'

/** Where the fake server places the default reference postal code (sector 55). */
export const HOME = { latitude: 1.37, longitude: 103.893 }

/** A school as the server stores it: the payload the client reads, and the columns it ignores. */
export type ServerSchool = SchoolDetailPayload & {
  mainlevel_code: string
  rank_2017: number | null
}

type SchoolOptions = Partial<ServerSchool>

function school(
  id: number,
  key: string,
  name: string,
  mainlevel: string,
  position: [number, number],
  options: SchoolOptions = {},
): ServerSchool {
  return {
    id,
    school_key: key,
    school_name: name,
    address: `${id} Example Road`,
    postal_code: String(100000 + id),
    latitude: position[0],
    longitude: position[1],
    area: 'Hougang',
    mrt_desc: `Station ${id}`,
    bus_desc: `${id}0, ${id}1`,
    mainlevel_code: mainlevel,
    stages: ['primary'],
    school_type: 'Government',
    gendermix: 'Mixed',
    psle_2017_cutoff: null,
    rank_2017: null,
    places_taken_phase2b: null,
    url_address: `https://school${id}.example.edu.sg/`,
    telephone_no: `6000000${id}`,
    email_address: `school${id}@moe.edu.sg`,
    principal_name: 'MR LIM EXAMPLE',
    sap_ind: 'No',
    autonomous_ind: 'No',
    gifted_ind: 'No',
    ip_ind: 'No',
    ib: 'N',
    alp_domain: null,
    alp_title: null,
    llp_domain1: null,
    llp_title: null,
    subjects_list: ['English Language', 'Mathematics'],
    cca_details: [],
    moe_programmes: [],
    programmes: [],
    financial_aid: [],
    scholarships: [],
    ...options,
  }
}

/** A small school database: four primary schools, four secondary, and two junior colleges. */
export const SCHOOLS: ServerSchool[] = [
  school(1, 'nanyang primary', 'NANYANG PRIMARY SCHOOL', 'PRIMARY', [1.321, 103.803], {
    places_taken_phase2b: 120,
    school_type: 'Government-Aided',
  }),
  school(2, 'rosyth', 'ROSYTH SCHOOL', 'PRIMARY', [1.375, 103.885], {
    places_taken_phase2b: 95,
    gifted_ind: 'Yes',
    alp_domain: 'Sciences',
    alp_title: 'Science in Action',
    subjects_list: ['English Language', 'Higher Chinese', 'Mathematics'],
    cca_details: [
      {
        grouping: 'CHINESE DANCE',
        generic_name: 'VISUAL AND PERFORMING ARTS',
        customised_name: null,
      },
      {
        grouping: 'ART AND CRAFTS',
        generic_name: 'CLUBS AND SOCIETIES',
        customised_name: 'VISUAL ARTS',
      },
    ],
  }),
  school(3, 'tao nan', 'TAO NAN SCHOOL', 'PRIMARY', [1.305, 103.91], {
    places_taken_phase2b: 140,
    school_type: 'Government-Aided',
  }),
  school(4, 'zhonghua primary', 'ZHONGHUA PRIMARY SCHOOL', 'PRIMARY', [1.372, 103.894], {
    places_taken_phase2b: 80,
  }),
  school(
    5,
    'raffles institution',
    'RAFFLES INSTITUTION',
    'MIXED LEVEL (S1-JC2)',
    [1.3457, 103.8437],
    {
      stages: ['secondary', 'postsec'],
      school_type: 'Independent',
      psle_2017_cutoff: 260,
      autonomous_ind: 'Yes',
      ip_ind: 'Yes',
      gendermix: 'Boys',
      moe_programmes: ['ENHANCED MUSIC PROGRAMME'],
    },
  ),
  school(
    6,
    'cedar girls secondary',
    "CEDAR GIRLS' SECONDARY SCHOOL",
    'SECONDARY (S1-S5)',
    [1.3395, 103.8336],
    {
      stages: ['secondary'],
      psle_2017_cutoff: 250,
      gendermix: 'Girls',
    },
  ),
  school(
    7,
    'bukit panjang govt high',
    'BUKIT PANJANG GOVT. HIGH SCHOOL',
    'SECONDARY (S1-S5)',
    [1.3768, 103.7712],
    {
      stages: ['secondary'],
      psle_2017_cutoff: 220,
    },
  ),
  school(
    8,
    'st gabriel s secondary',
    "ST. GABRIEL'S SECONDARY SCHOOL",
    'SECONDARY (S1-S4)',
    [1.3497, 103.8715],
    {
      stages: ['secondary'],
      school_type: 'Government-Aided',
      psle_2017_cutoff: 205,
    },
  ),
  school(
    9,
    'temasek junior college',
    'TEMASEK JUNIOR COLLEGE',
    'JUNIOR COLLEGE',
    [1.3157, 103.9331],
    {
      stages: ['postsec'],
    },
  ),
  school(
    10,
    'eunoia junior college',
    'EUNOIA JUNIOR COLLEGE',
    'JUNIOR COLLEGE',
    [1.3414, 103.8333],
    {
      stages: ['postsec'],
    },
  ),
]

/** A school as the directory shows it, for tests that do not need the server. */
export function makeSchool(overrides: Partial<School> = {}): School {
  return {
    id: 1,
    key: 'example',
    tier: 'primary',
    acronym: 'ES',
    name: 'Example School',
    type: 'Government',
    area: 'Hougang',
    address: '1 Example Road',
    postal: '100001',
    mrt: 'Station 1',
    bus: '10, 11',
    latitude: 1.37,
    longitude: 103.893,
    distanceKm: null,
    benchmark: null,
    history: [],
    courses: [],
    aid: [],
    scholarships: [],
    ...overrides,
  }
}

/** The fixture schools of a tier, mapped the way the directory maps them. */
export function schoolsOf(tier: DirectoryTierId): School[] {
  return SCHOOLS.filter((school) => school.stages.includes(tier)).map((school) =>
    toSchool(school, tier),
  )
}
