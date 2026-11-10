/** Adapted from docs/WIP_for_coming_labs/PathSG_Demo_Script.docx. */
export interface DemoStep {
  chapter: string
  title: string
  route: string
  target: string
  script: string
  cue: string
  seconds: number
  student?: boolean
  prepare?: 'directory' | 'search' | 'empty' | 'school' | 'generate'
}

export const SCRIPT_ID = 'pathsg-v1'
export const DEMO_STEPS: DemoStep[] = [
  {
    chapter: 'The idea',
    title: 'A clearer next step',
    route: '/',
    target: 'home-intro',
    seconds: 60,
    script:
      'A student has just received their results. What comes next: JC, polytechnic or ITE? And which school fits their grades and journey from home? PathSG brings those decisions together: one place to look up Singapore schools, and a personalised roadmap for the next step.',
    cue: 'Open with the problem. The audience sees the real PathSG home page.',
  },
  {
    chapter: 'The idea',
    title: 'Start where you are',
    route: '/',
    target: 'home-journey',
    seconds: 35,
    script:
      'The journey starts with the student’s current education level. Each stop explains what comes next, which results are needed, and how schools are compared. You can browse the directory without creating an account.',
    cue: 'Point out the education stops and school counts.',
  },
  {
    chapter: 'Guest',
    title: 'One school directory',
    route: '/directory',
    target: 'directory-tier',
    seconds: 35,
    prepare: 'directory',
    script:
      'This directory gathers school information from official MOE data. Switch between primary, secondary and post-secondary schools. Results include school type, distance and the relevant entry benchmark.',
    cue: 'The primary school directory is loaded with its filters reset.',
  },
  {
    chapter: 'Guest',
    title: 'Search by name or acronym',
    route: '/directory',
    target: 'directory-filters',
    seconds: 35,
    prepare: 'search',
    script:
      'Parents can search by a school’s name or acronym, then narrow their choices by school type and distance. We start with postal code 556000. Distances are calculated from postal-district centroids using the Haversine formula.',
    cue: 'The directory searches for Rosyth. Filters remain interactive on the display.',
  },
  {
    chapter: 'Guest',
    title: 'A useful empty result',
    route: '/directory',
    target: 'directory-results',
    seconds: 20,
    prepare: 'empty',
    script:
      'If a search has no matches, the page explains that clearly and offers a way to reset the filters. It never leaves a parent looking at an unexplained blank screen.',
    cue: 'A deliberately unmatched search shows the empty state.',
  },
  {
    chapter: 'Guest',
    title: 'Meet a school',
    route: 'school',
    target: 'school-identity',
    seconds: 30,
    prepare: 'school',
    script:
      'A school profile brings together its identity, contact information, address and transport connections. Missing source information is labelled “Not available” rather than invented.',
    cue: 'Open Rosyth’s profile, or the first available primary school.',
  },
  {
    chapter: 'Guest',
    title: 'Put the journey on a map',
    route: 'school',
    target: 'school-location',
    seconds: 25,
    script:
      'The map shows the school and the postal district used for the distance calculation. Parents can see the journey in context. Map tiles come from OneMap; distance calculations do not depend on the map service.',
    cue: 'The location section is brought into view.',
  },
  {
    chapter: 'Guest',
    title: 'Fees and entry benchmarks',
    route: 'school',
    target: 'school-fees',
    seconds: 30,
    script:
      'Families can compare fees for citizens, permanent residents and international students. Entry benchmarks and financial support are shown further down the profile. Historical figures appear only when the dataset includes them.',
    cue: 'Highlight the fee table. Pause following if you want to explore the tabs.',
  },
  {
    chapter: 'Guest',
    title: 'Programmes and real perspectives',
    route: 'school',
    target: 'school-programmes',
    seconds: 30,
    script:
      'Beyond grades, families can explore programmes, subjects and CCAs. Reviews provide another perspective. Guests can read reviews, while posting a review requires an account.',
    cue: 'Focus on the programmes, then continue to the reviews.',
  },
  {
    chapter: 'Student',
    title: 'An account without personal identifiers',
    route: '/login',
    target: 'login',
    seconds: 35,
    script:
      'An account needs only a username and password. We do not collect names, birth dates or NRIC numbers. Password rules are explained as you type. The server hashes passwords with bcrypt and sessions renew using single-use refresh tokens.',
    cue: 'Show registration and login. The next step can prepare a sample student automatically.',
  },
  {
    chapter: 'Student',
    title: 'Results and location, entered once',
    route: '/profile',
    target: 'profile-postal',
    seconds: 35,
    student: true,
    script:
      'The student profile holds a postal code and academic results. For this example, our student has PSLE AL 8 and postal code 556000. The saved postal code becomes the default reference for distances throughout the app.',
    cue: 'A dedicated sample student is prepared if the display is not already signed in.',
  },
  {
    chapter: 'Student',
    title: 'Validation on both sides',
    route: '/profile',
    target: 'profile-results',
    seconds: 30,
    student: true,
    script:
      'Academic fields change with the target level. A PSLE score must be between 4 and 32. Both the browser and server validate the same limits, so an invalid score cannot be saved by bypassing the form.',
    cue: 'Point out the target level and academic fields. Use Pause following for a manual validation example.',
  },
  {
    chapter: 'Student',
    title: 'Keep a shortlist',
    route: '/saved',
    target: 'saved-schools',
    seconds: 30,
    student: true,
    script:
      'Bookmarks keep a shortlist in one place. The saved count updates immediately, and each school shows its distance from the saved postal code. A student can return to these choices after signing in again.',
    cue: 'The sample student has two bookmarked schools when data is available.',
  },
  {
    chapter: 'Student',
    title: 'Reviews belong to their author',
    route: 'school',
    target: 'school-reviews',
    seconds: 35,
    student: true,
    script:
      'A signed-in student can write one review per school, then edit or delete their own review. A live counter enforces the 200-word limit. Deletion asks for confirmation, and HTML tags are stripped from review text.',
    cue: 'Show the review composer. No review is submitted automatically.',
  },
  {
    chapter: 'The roadmap',
    title: 'Turn a profile into a pathway',
    route: '/roadmap',
    target: 'roadmap-stage',
    seconds: 40,
    student: true,
    script:
      'Back to the question we started with: what is the best next step? The roadmap pre-selects the stage from the profile and shows the score and postal code being used. Next, we generate two independent plans.',
    cue: 'The next step generates the plans using the sample profile.',
  },
  {
    chapter: 'The roadmap',
    title: 'Two plans, independently generated',
    route: '/roadmap',
    target: 'roadmap-plans',
    seconds: 50,
    student: true,
    prepare: 'generate',
    script:
      'The rule-based plan applies official entry rules. Beside it is an example of the AI-generated alternative. For this presentation, the AI panel uses prepared sample recommendations so there is no waiting on an external service. In the live product, the plans load independently, and the username is never sent to the AI model.',
    cue: 'The AI panel uses a labelled demo sample. No API key, external AI request or timeout is involved.',
  },
  {
    chapter: 'The roadmap',
    title: 'Let the student define “best”',
    route: '/roadmap',
    target: 'roadmap-rule',
    seconds: 45,
    student: true,
    script:
      'Students can rank by grade fit or distance. Under grade ranking, they can set an acceptable journey distance. Changing this setting re-ranks only the rule-based plan. The AI plan remains independent. The About dialog explains how the ranking works.',
    cue: 'Use Pause following to explore grade, distance and the About dialog on the display.',
  },
  {
    chapter: 'The roadmap',
    title: 'Save a decision, then refine it',
    route: '/roadmap',
    target: 'roadmap-rule',
    seconds: 35,
    student: true,
    script:
      'A student can save one roadmap, replace it with confirmation, and edit school choices within that stage. A saved roadmap also has its own map. Delete uses the same confirmation pattern as reviews.',
    cue: 'Saving and deletion stay deliberate actions on the display; Next never overwrites a plan.',
  },
  {
    chapter: 'Administrator',
    title: 'Keep the data current',
    route: '/admin',
    target: 'admin-dataset',
    seconds: 45,
    script:
      'Administrators can update the school dataset with CSV files. Files are recognised by their columns, and an update runs in one transaction: a failure rolls back the entire change. Export downloads school records only, excluding accounts, reviews and roadmaps.',
    cue: 'Requires an administrator account on the laptop. If needed, pause and sign in; then press Refocus. This demo never grants admin privileges or uploads files automatically.',
  },
  {
    chapter: 'Engineering',
    title: 'Layers with clear responsibilities',
    route: '/',
    target: 'home-intro',
    seconds: 40,
    script:
      'Each layer has one job. ReviewSection renders the view, the review store coordinates behaviour, the service calls the API, and the server model enforces the rules. Shared dialogs and small reusable components keep those responsibilities separate.',
    cue: 'Optional: show the IDE beside the browser and trace the review flow.',
  },
  {
    chapter: 'Engineering',
    title: 'Reactive state and systematic tests',
    route: '/',
    target: 'home-journey',
    seconds: 40,
    script:
      'Vue reactivity keeps observers in sync: changing a search filter resets pagination, and changing a target level discards stale plans. Tests cover boundary values such as PSLE 3, 4, 32 and 33, plus late AI responses. CI checks formatting, types, tests and builds before publishing images.',
    cue: 'Connect each practice to an example from the live demo.',
  },
  {
    chapter: 'Engineering',
    title: 'Follow a requirement into the code',
    route: '/',
    target: 'home-intro',
    seconds: 45,
    script:
      'AI fault isolation connects requirements 3.7 to 3.9 to the generation use case, separate rule and AI states in the roadmap store, the Retry control, and tests for independent failures. Score validation follows the same chain from requirement 2.8 to browser validation, server validation and boundary tests.',
    cue: 'Keep the SRS, use case diagram and design class diagram ready in separate tabs.',
  },
  {
    chapter: 'Wrap-up',
    title: 'One place to look. A path to take.',
    route: '/',
    target: 'home-intro',
    seconds: 20,
    script:
      'PathSG brings school information together and helps students find a realistic next step from their grades and location. One place to compare schools, and a roadmap to move forward. Thank you. We’re happy to take questions.',
    cue: 'Leave the home page on screen for questions. End the session when you are done.',
  },
]
