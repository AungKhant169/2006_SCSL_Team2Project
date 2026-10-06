import type {
  BenchmarkPoint,
  BenchmarkSpec,
  Course,
  FeeSchedule,
  School,
  TierId,
} from '@/types/school'

/*
 * Illustrative school records (figures are indicative only). They stand in for the
 * database that the admin dataset update will populate once the backend exposes it.
 */

const HISTORY_YEARS = ['2022', '2023', '2024', '2025']

const fees = (sc: number, pr: number, intl: number): FeeSchedule => ({ sc, pr, intl })
const course = (name: string, field: string, schedule: FeeSchedule, miscFee: number): Course => ({
  name,
  field,
  fees: schedule,
  miscFee,
})
const history = (values: number[]): BenchmarkPoint[] =>
  values.map((value, i) => ({ year: HISTORY_YEARS[i]!, value }))

const NO_FEE = fees(0, 0, 0)
const PRIMARY_FEE = fees(13, 245, 905)
const SECONDARY_FEE = fees(5, 500, 1550)
const ASSISTANCE_FULL_WAIVER = 'Full waiver of school and standard misc. fees'
const FAS = 'MOE Financial Assistance Scheme'
const TUITION_GRANT = 'MOE Tuition Grant'
const HEB = 'Higher Education Bursary'
const MERIT_BURSARY = 'Edusave Merit Bursary'
const BURSARY_INCOME = 'Top 25% of level; household income ≤ $6,900/month'

const RATIO: BenchmarkSpec = { format: { kind: 'ratio' }, max: 4 }
const PSLE_AL: BenchmarkSpec = { format: { kind: 'alRange' }, max: 32, inverse: true }
const L1R5: BenchmarkSpec = { format: { kind: 'cutoff', scale: 'L1R5' }, max: 20, inverse: true }
const ELR2B2: BenchmarkSpec = {
  format: { kind: 'cutoff', scale: 'ELR2B2' },
  max: 30,
  inverse: true,
}
const gpaRange = (upper: number): BenchmarkSpec => ({ format: { kind: 'gpaRange', upper }, max: 4 })

export const SCHOOLS: School[] = [
  {
    id: 1,
    tier: 'primary',
    acronym: 'NYPS',
    name: 'Nanyang Primary School',
    type: 'Government-Aided',
    area: 'Bukit Timah',
    address: "52 King's Road",
    postal: '268097',
    mrt: 'Tan Kah Kee (DT8)',
    bus: 'Opp Nanyang Pr Sch (Stop 41071)',
    distanceKm: 4.6,
    benchmark: RATIO,
    history: history([3.1, 2.8, 3.4, 3.0]),
    courses: [
      course('Standard curriculum (P1–P6)', 'General', PRIMARY_FEE, 13),
      course('Higher Chinese', 'Languages', NO_FEE, 0),
      course('Gifted Education Programme (P4–P6)', 'Enrichment', NO_FEE, 0),
    ],
    aid: [
      {
        name: FAS,
        note: 'Full waiver of school and standard misc. fees; free textbooks and uniforms',
      },
      {
        name: 'School-based Financial Assistance',
        note: 'For households marginally above FAS thresholds',
      },
    ],
    scholarships: [
      {
        name: 'Edusave Scholarship for Primary Schools',
        source: 'MOE',
        eligibility: 'Top 10% of level in academic performance; SC only',
      },
      {
        name: MERIT_BURSARY,
        source: 'MOE',
        eligibility: BURSARY_INCOME,
      },
    ],
  },
  {
    id: 2,
    tier: 'primary',
    acronym: 'RS',
    name: 'Rosyth School',
    type: 'Government',
    area: 'Serangoon',
    address: '21 Serangoon North Avenue 4',
    postal: '555855',
    mrt: 'Serangoon (NE12)',
    bus: 'Rosyth Sch (Stop 66339)',
    distanceKm: 1.4,
    benchmark: RATIO,
    history: history([2.2, 2.5, 2.1, 2.4]),
    courses: [
      course('Standard curriculum (P1–P6)', 'General', PRIMARY_FEE, 13),
      course('Gifted Education Programme (P4–P6)', 'Enrichment', NO_FEE, 0),
    ],
    aid: [{ name: FAS, note: ASSISTANCE_FULL_WAIVER }],
    scholarships: [{ name: MERIT_BURSARY, source: 'MOE', eligibility: BURSARY_INCOME }],
  },
  {
    id: 3,
    tier: 'primary',
    acronym: 'TNS',
    name: 'Tao Nan School',
    type: 'Government-Aided',
    area: 'Marine Parade',
    address: '49 Marine Crescent',
    postal: '449761',
    mrt: 'Marine Parade (TE26)',
    bus: 'Tao Nan Sch (Stop 93069)',
    distanceKm: 9.8,
    benchmark: RATIO,
    history: history([1.6, 1.9, 2.0, 1.8]),
    courses: [
      course('Standard curriculum (P1–P6)', 'General', PRIMARY_FEE, 13),
      course('Higher Chinese', 'Languages', NO_FEE, 0),
    ],
    aid: [{ name: FAS, note: ASSISTANCE_FULL_WAIVER }],
    scholarships: [
      {
        name: 'Edusave Scholarship for Primary Schools',
        source: 'MOE',
        eligibility: 'Top 10% of level; SC only',
      },
    ],
  },
  {
    id: 4,
    tier: 'primary',
    acronym: 'ZHPS',
    name: 'Zhonghua Primary School',
    type: 'Government',
    area: 'Serangoon',
    address: '12 Serangoon Avenue 4',
    postal: '556095',
    mrt: 'Lorong Chuan (CC14)',
    bus: 'Zhonghua Pr Sch (Stop 66009)',
    distanceKm: 0.8,
    benchmark: RATIO,
    history: history([1.1, 1.3, 1.0, 1.2]),
    courses: [course('Standard curriculum (P1–P6)', 'General', PRIMARY_FEE, 13)],
    aid: [{ name: FAS, note: ASSISTANCE_FULL_WAIVER }],
    scholarships: [{ name: MERIT_BURSARY, source: 'MOE', eligibility: BURSARY_INCOME }],
  },
  {
    id: 5,
    tier: 'secondary',
    acronym: 'RI',
    name: 'Raffles Institution',
    type: 'Independent',
    area: 'Bishan',
    address: '1 Raffles Institution Lane',
    postal: '575954',
    mrt: 'Marymount (CC16)',
    bus: 'Raffles Instn (Stop 53041)',
    distanceKm: 3.2,
    benchmark: PSLE_AL,
    history: history([6, 6, 7, 6]),
    courses: [
      course('Raffles Programme (Integrated)', 'IP', fees(350, 750, 1650), 40),
      course('Bicultural Studies Programme', 'Humanities', NO_FEE, 0),
    ],
    aid: [
      {
        name: 'MOE Independent School Bursary',
        note: 'Up to 100% fee subsidy by household income',
      },
      { name: 'RI Bursary', note: 'School-funded top-up for FAS-eligible students' },
    ],
    scholarships: [
      {
        name: 'Raffles Scholarship',
        source: 'School',
        eligibility: 'Top PSLE performers; SC only',
      },
      { name: 'MOE Edusave Scholarship', source: 'MOE', eligibility: 'Top 10% of level' },
    ],
  },
  {
    id: 6,
    tier: 'secondary',
    acronym: 'CGSS',
    name: "Cedar Girls' Secondary School",
    type: 'Autonomous',
    area: 'Potong Pasir',
    address: '1 Cedar Avenue',
    postal: '349692',
    mrt: 'Potong Pasir (NE10)',
    bus: "Cedar Girls' Sec Sch (Stop 60211)",
    distanceKm: 2.9,
    benchmark: PSLE_AL,
    history: history([8, 8, 9, 8]),
    courses: [
      course('Integrated Programme (with VJC)', 'IP', fees(5, 500, 1550), 20),
      course('O-Level Express', 'G3', SECONDARY_FEE, 20),
    ],
    aid: [{ name: FAS, note: ASSISTANCE_FULL_WAIVER }],
    scholarships: [
      {
        name: 'Edusave Scholarship for Secondary Schools',
        source: 'MOE',
        eligibility: 'Top 10% of level',
      },
    ],
  },
  {
    id: 7,
    tier: 'secondary',
    acronym: 'BPGHS',
    name: 'Bukit Panjang Government High School',
    type: 'Government',
    area: 'Choa Chu Kang',
    address: '20 Choa Chu Kang Avenue 1',
    postal: '689792',
    mrt: 'Choa Chu Kang (NS4)',
    bus: 'Bt Panjang Govt High (Stop 44399)',
    distanceKm: 14.1,
    benchmark: PSLE_AL,
    history: history([13, 12, 12, 11]),
    courses: [
      course('O-Level Express', 'G3', SECONDARY_FEE, 20),
      course('Normal (Academic) / G2', 'G2', SECONDARY_FEE, 20),
      course('Normal (Technical) / G1', 'G1', SECONDARY_FEE, 20),
    ],
    aid: [{ name: FAS, note: ASSISTANCE_FULL_WAIVER }],
    scholarships: [{ name: MERIT_BURSARY, source: 'MOE', eligibility: 'Top 25% of level' }],
  },
  {
    id: 8,
    tier: 'secondary',
    acronym: 'SGSS',
    name: "St. Gabriel's Secondary School",
    type: 'Government-Aided',
    area: 'Serangoon',
    address: '26 Serangoon Avenue 1',
    postal: '556131',
    mrt: 'Lorong Chuan (CC14)',
    bus: "St Gabriel's Sec (Stop 66031)",
    distanceKm: 1.1,
    benchmark: PSLE_AL,
    history: history([17, 16, 16, 15]),
    courses: [
      course('O-Level Express', 'G3', SECONDARY_FEE, 20),
      course('Normal (Academic) / G2', 'G2', SECONDARY_FEE, 20),
    ],
    aid: [{ name: FAS, note: ASSISTANCE_FULL_WAIVER }],
    scholarships: [{ name: MERIT_BURSARY, source: 'MOE', eligibility: 'Top 25% of level' }],
  },
  {
    id: 9,
    tier: 'postsec',
    acronym: 'SP',
    name: 'Singapore Polytechnic',
    type: 'Government',
    area: 'Dover',
    address: '500 Dover Road',
    postal: '139651',
    mrt: 'Dover (EW22)',
    bus: 'Singapore Poly (Stop 18101)',
    distanceKm: 11.5,
    fields: ['STEM', 'Business', 'Healthcare'],
    benchmark: ELR2B2,
    history: history([10, 9, 9, 8]),
    courses: [
      course('Diploma in Computer Science', 'STEM', fees(3100, 6300, 11400), 300),
      course('Diploma in Business Administration', 'Business', fees(3100, 6300, 11400), 300),
      course('Diploma in Optometry', 'Healthcare', fees(3100, 6300, 11400), 300),
      course('Diploma in Mechanical Engineering', 'STEM', fees(3100, 6300, 11400), 300),
    ],
    aid: [
      { name: TUITION_GRANT, note: 'Applied automatically; PR/international sign a service bond' },
      { name: HEB, note: 'Up to $2,750/year by household income' },
      { name: 'CDC/CCC Polytechnic Bursary', note: 'For lower-income households' },
    ],
    scholarships: [
      {
        name: 'SP Scholarship',
        source: 'School',
        eligibility: 'Strong O-Level results and CCA record',
      },
      {
        name: 'MOE Polytechnic Foundation Programme Award',
        source: 'MOE',
        eligibility: 'PFP students; SC only',
      },
    ],
  },
  {
    id: 10,
    tier: 'postsec',
    acronym: 'NP',
    name: 'Ngee Ann Polytechnic',
    type: 'Government',
    area: 'Clementi',
    address: '535 Clementi Road',
    postal: '599489',
    mrt: 'King Albert Park (DT6)',
    bus: 'Ngee Ann Poly (Stop 12101)',
    distanceKm: 10.7,
    fields: ['STEM', 'Business', 'Arts', 'Healthcare'],
    benchmark: ELR2B2,
    history: history([11, 10, 10, 9]),
    courses: [
      course('Diploma in Information Technology', 'STEM', fees(3100, 6300, 11400), 300),
      course('Diploma in Cybersecurity & Digital Forensics', 'STEM', fees(3100, 6300, 11400), 300),
      course('Diploma in Mass Communication', 'Arts', fees(3100, 6300, 11400), 300),
      course('Diploma in Nursing', 'Healthcare', fees(3100, 6300, 11400), 300),
      course('Diploma in Accountancy', 'Business', fees(3100, 6300, 11400), 300),
    ],
    aid: [
      { name: TUITION_GRANT, note: 'Applied automatically' },
      { name: HEB, note: 'Up to $2,750/year by household income' },
    ],
    scholarships: [
      {
        name: 'NP Scholarship',
        source: 'School',
        eligibility: 'Outstanding O-Level results; leadership record',
      },
    ],
  },
  {
    id: 11,
    tier: 'postsec',
    acronym: 'HCI',
    name: 'Hwa Chong Institution (JC)',
    type: 'Independent',
    area: 'Bukit Timah',
    address: '661 Bukit Timah Road',
    postal: '269734',
    mrt: 'Tan Kah Kee (DT8)',
    bus: 'Hwa Chong Instn (Stop 41011)',
    distanceKm: 5.9,
    fields: ['STEM', 'Arts'],
    benchmark: L1R5,
    history: history([6, 5, 5, 5]),
    courses: [
      course('Science stream (H2 Math, Physics, Chemistry)', 'STEM', fees(3900, 8400, 18000), 360),
      course(
        'Arts stream (H2 Economics, History, Literature)',
        'Arts',
        fees(3900, 8400, 18000),
        360,
      ),
      course('Hybrid (H2 Math, Economics, Chemistry)', 'STEM', fees(3900, 8400, 18000), 360),
    ],
    aid: [
      { name: 'MOE Independent School Bursary', note: 'Up to 100% fee subsidy' },
      { name: 'HCI Financial Assistance', note: 'School-funded support for needy students' },
    ],
    scholarships: [
      {
        name: 'Hwa Chong Scholarship',
        source: 'School',
        eligibility: 'Top O-Level or IP performers',
      },
    ],
  },
  {
    id: 12,
    tier: 'postsec',
    acronym: 'TJC',
    name: 'Temasek Junior College',
    type: 'Government',
    area: 'Bedok',
    address: '22 Bedok South Road',
    postal: '469278',
    mrt: 'Bedok (EW5)',
    bus: 'Temasek JC (Stop 84031)',
    distanceKm: 10.2,
    fields: ['STEM', 'Arts'],
    benchmark: L1R5,
    history: history([9, 8, 8, 7]),
    courses: [
      course('Science stream', 'STEM', fees(72, 780, 2280), 30),
      course('Arts stream', 'Arts', fees(72, 780, 2280), 30),
    ],
    aid: [{ name: FAS, note: ASSISTANCE_FULL_WAIVER }],
    scholarships: [
      { name: 'Edusave Scholarship for Pre-U', source: 'MOE', eligibility: 'Top 10% of level' },
    ],
  },
  {
    id: 13,
    tier: 'postsec',
    acronym: 'EBA',
    name: 'Eastbridge Academy (Private)',
    type: 'Private',
    area: 'Toa Payoh',
    address: '20 Lorong 6 Toa Payoh',
    postal: '319400',
    mrt: 'Braddell (NS18)',
    bus: 'Opp Braddell Stn (Stop 52149)',
    distanceKm: 2.0,
    fields: ['Business', 'Arts'],
    benchmark: ELR2B2,
    history: history([26, 26, 25, 25]),
    courses: [
      course('Diploma in Business Management', 'Business', fees(9800, 9800, 12500), 450),
      course('Diploma in Design Communication', 'Arts', fees(10400, 10400, 13200), 450),
    ],
    aid: [{ name: 'Institutional fee waiver', note: 'Partial waiver for FAS-eligible students' }],
    scholarships: [{ name: 'Merit Entry Award', source: 'School', eligibility: 'ELR2B2 ≤ 15' }],
  },
  {
    id: 14,
    tier: 'uni',
    acronym: 'NUS',
    name: 'National University of Singapore',
    type: 'Autonomous',
    area: 'Kent Ridge',
    address: '21 Lower Kent Ridge Road',
    postal: '119077',
    mrt: 'Kent Ridge (CC24)',
    bus: 'Kent Ridge Stn (Stop 18331)',
    distanceKm: 13.4,
    fields: ['STEM', 'Business', 'Healthcare', 'Arts'],
    benchmark: gpaRange(4),
    history: history([3.8, 3.85, 3.85, 3.9]),
    courses: [
      course('Bachelor of Computing (Computer Science)', 'STEM', fees(9400, 13700, 21000), 600),
      course('Business Administration', 'Business', fees(9950, 14500, 22200), 600),
      course('Medicine', 'Healthcare', fees(32900, 46700, 71800), 600),
      course('Sociology', 'Arts', fees(8700, 12700, 19400), 600),
    ],
    aid: [
      { name: TUITION_GRANT, note: 'Applied automatically; PR/international sign a 3-year bond' },
      { name: HEB, note: 'Up to $6,200/year by household income' },
      { name: 'NUS Study Loan', note: 'Interest-free during candidature' },
    ],
    scholarships: [
      {
        name: 'NUS Merit Scholarship',
        source: 'School',
        eligibility: 'Strong A-Level / poly GPA ≥ 3.9; leadership',
      },
      {
        name: 'Public Service Commission Scholarship',
        source: 'External',
        eligibility: 'SC; outstanding results and service commitment',
      },
    ],
  },
  {
    id: 15,
    tier: 'uni',
    acronym: 'NTU',
    name: 'Nanyang Technological University',
    type: 'Autonomous',
    area: 'Jurong West',
    address: '50 Nanyang Avenue',
    postal: '639798',
    mrt: 'Pioneer (EW28)',
    bus: 'Lee Wee Nam Lib (Stop 27211)',
    distanceKm: 20.3,
    fields: ['STEM', 'Business', 'Arts'],
    benchmark: gpaRange(3.98),
    history: history([3.65, 3.7, 3.75, 3.75]),
    courses: [
      course('Computer Engineering', 'STEM', fees(8500, 12300, 19000), 600),
      course('Accountancy', 'Business', fees(9500, 13800, 21200), 600),
      course('Communication Studies', 'Arts', fees(8500, 12300, 19000), 600),
    ],
    aid: [
      { name: TUITION_GRANT, note: 'Applied automatically' },
      { name: HEB, note: 'Up to $6,200/year by household income' },
    ],
    scholarships: [
      { name: 'Nanyang Scholarship', source: 'School', eligibility: 'Top 5% of cohort; SC/PR' },
    ],
  },
  {
    id: 16,
    tier: 'uni',
    acronym: 'SMU',
    name: 'Singapore Management University',
    type: 'Autonomous',
    area: 'Bras Basah',
    address: '81 Victoria Street',
    postal: '188065',
    mrt: 'Bras Basah (CC2)',
    bus: 'SMU (Stop 04121)',
    distanceKm: 6.4,
    fields: ['Business', 'STEM'],
    benchmark: gpaRange(3.97),
    history: history([3.7, 3.75, 3.8, 3.8]),
    courses: [
      course('Business Management', 'Business', fees(12650, 18400, 28200), 550),
      course('Information Systems', 'STEM', fees(11900, 17300, 26600), 550),
    ],
    aid: [
      { name: TUITION_GRANT, note: 'Applied automatically' },
      {
        name: 'SMU Access Bursary',
        note: 'Covers full tuition after grants for lower-income SC',
      },
    ],
    scholarships: [
      {
        name: 'SMU Global Impact Scholarship',
        source: 'School',
        eligibility: 'Exceptional academics and community leadership',
      },
    ],
  },
  {
    id: 17,
    tier: 'uni',
    acronym: 'KHE',
    name: 'Kaplan Higher Education (Private)',
    type: 'Private',
    area: 'Rochor',
    address: '8 Wilkie Road',
    postal: '228095',
    mrt: 'Little India (DT12)',
    bus: 'Kaplan City Campus (Stop 07021)',
    distanceKm: 5.7,
    fields: ['Business', 'STEM'],
    benchmark: gpaRange(3.6),
    history: history([2.5, 2.5, 2.6, 2.6]),
    courses: [
      course('BSc Business & Management (UCD)', 'Business', fees(28000, 28000, 32000), 800),
      course('BSc Computing (Murdoch)', 'STEM', fees(30500, 30500, 34500), 800),
    ],
    aid: [{ name: 'Institutional fee waiver', note: 'Case-by-case for financial hardship' }],
    scholarships: [{ name: 'Kaplan Merit Award', source: 'School', eligibility: 'Poly GPA ≥ 3.5' }],
  },
]

export function getSchool(id: number): School | undefined {
  return SCHOOLS.find((s) => s.id === id)
}

export function schoolsInTier(tier: TierId): School[] {
  return SCHOOLS.filter((s) => s.tier === tier)
}
