/** Live Demo sections 1–10 of PathSG_Demo_Script_Updated.docx. */
export type DemoFeature = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
export type DemoAutomation = 'home' | 'tiers' | 'search' | 'empty' | 'review'

export interface DemoStep {
  feature: DemoFeature
  chapter: string
  title: string
  route: string
  target: string
  script: string
  cue: string
  actions: string[]
  seconds: number
  student?: boolean
  automation?: DemoAutomation
  prepare?: 'directory' | 'search' | 'empty' | 'school' | 'generate' | 'logout'
}

export const SCRIPT_ID = 'pathsg-v2'
export const DEMO_STEPS: DemoStep[] = [
  {
    feature: 1,
    chapter: 'Guest home page',
    title: 'Choose the starting level',
    route: '/',
    target: 'home-journey',
    seconds: 35,
    automation: 'home',
    script:
      'I’ll start the live demonstration as a guest. On the home page, I can choose where the student is now. Selecting Secondary moves the “You are here” marker and shows the next transition, the results needed, and the benchmark used to compare schools. The counts below the stops show the schools available at each level. Guests can browse these schools, but building a roadmap requires an account.',
    actions: [
      'Watch Secondary being selected and point out the changed guidance.',
      'Show the school counts, Browse link, and guest navigation.',
    ],
    cue: 'Begin after the opening speaker hands over. Do not repeat the product pitch. Planned finish: 00:35.',
  },
  {
    feature: 2,
    chapter: 'School directory',
    title: 'Browse the education tiers',
    route: '/directory',
    target: 'directory-tier',
    seconds: 25,
    prepare: 'directory',
    automation: 'tiers',
    script:
      'The directory opens with the education tiers across the top. I’ll move from Primary to Secondary, then Post-Secondary, and return to Secondary. The institutions and available filters change with the tier. Each results page shows a count and up to ten schools, so users can tell how broad their shortlist is before opening individual profiles.',
    actions: [
      'Watch the tier buttons being selected in sequence.',
      'Point out the result count and pagination.',
    ],
    cue: 'The animated clicks return to Secondary for the RI search.',
  },
  {
    feature: 2,
    chapter: 'School directory',
    title: 'Search RI, then narrow the results',
    route: '/directory',
    target: 'directory-filters',
    seconds: 35,
    prepare: 'search',
    automation: 'search',
    script:
      'I’ll type “RI” to search by an acronym rather than the full school name. Search accepts a minimum of two characters. Beside it, I can filter by school type and by one, two or five kilometres from a postal code. I can also sort alphabetically or by nearest distance. These distances use postal-district centroids; loading the map service is not required for this calculation.',
    actions: [
      'Watch RI being typed into Keyword.',
      'Clear RI, demonstrate School type and Distance, then choose nearest sorting.',
    ],
    cue: 'Pause following for the manual filter examples; resume before advancing. Keep postal code 556000.',
  },
  {
    feature: 2,
    chapter: 'School directory',
    title: 'Recover from an empty search',
    route: '/directory',
    target: 'directory-filters',
    seconds: 20,
    prepare: 'empty',
    automation: 'empty',
    script:
      'Now I’ll search for a name that does not exist. Instead of an unexplained blank page, we get “No Schools Found” and a reset option. Reset All Filters restores the list. Invalid symbols are also sanitised with a message, so the user has a clear way to correct a search.',
    actions: [
      'Watch zzzz being typed; leave the empty result visible briefly.',
      'Click Reset All Filters.',
    ],
    cue: 'Finish the directory demonstration by 01:55. The next card opens Rosyth directly.',
  },
  {
    feature: 3,
    chapter: 'School profile and guest reviews',
    title: 'Open a school profile',
    route: 'school',
    target: 'school-identity',
    seconds: 15,
    prepare: 'school',
    script:
      'Opening Rosyth brings its details into one profile. Here are its identity, address, contact information and nearby transport connections. When the source dataset does not include a detail, the page says “Not available” rather than leaving an ambiguous blank.',
    actions: ['Point out the school name, address, contact information, MRT and bus details.'],
    cue: 'Use the first available primary school if Rosyth is absent from the dataset.',
  },
  {
    feature: 3,
    chapter: 'School profile and guest reviews',
    title: 'Explain the map pins',
    route: 'school',
    target: 'school-location',
    seconds: 15,
    script:
      'The location map puts those details in context. The school has its own pin, while the house pin marks the postal district used as the reference point. That explains where the displayed distance is measured from; it is not a door-to-door journey estimate.',
    actions: ['Point to the school pin and the house pin.'],
    cue: 'Give the audience time to identify both pins.',
  },
  {
    feature: 3,
    chapter: 'School profile and guest reviews',
    title: 'Compare fees and entry information',
    route: 'school',
    target: 'school-fees',
    seconds: 20,
    script:
      'The fee table lets a family compare the categories for citizens, permanent residents and international students. Below it are the entry benchmarks and financial support information. Historical figures appear only when that data is loaded. I’ll switch the fee category so we can see the values change.',
    actions: [
      'Switch the fee category from Citizen to PR and International.',
      'Point out benchmark history, financial aid and scholarships below.',
    ],
    cue: 'Pause following to scroll if necessary. Missing historical data should be described as unavailable.',
  },
  {
    feature: 3,
    chapter: 'School profile and guest reviews',
    title: 'Read programmes and guest reviews',
    route: 'school',
    target: 'school-programmes',
    seconds: 20,
    script:
      'The profile also lists programmes, subjects and CCAs, followed by reviews with the newest first. As a guest, I can read the reviews. If I choose Write a review, the app asks me to log in or create an account. I’ll show that prompt before moving into the student features.',
    actions: [
      'Scroll to the reviews and click Write a review.',
      'Show the login prompt, then dismiss it.',
    ],
    cue: 'Complete the guest profile section by 03:05.',
  },
  {
    feature: 4,
    chapter: 'Register and login',
    title: 'Validate an account, then sign in',
    route: '/login',
    target: 'login',
    seconds: 65,
    script:
      'On the account page, I’ll choose Create account. First I’ll enter a username containing a symbol to show the validation message. Next, a weak password leaves requirements unticked in the live checklist. Replacing it with a valid password completes the checklist. Only a username and password are requested; there is no name, date of birth or NRIC field.\n\nI’ll now submit valid details. A new student arrives at My profile with a welcome notice. Existing students can use Log in instead. Passwords are hashed before storage. The short-lived access token is renewed automatically using a single-use refresh token, so the student does not have to keep signing in during normal use.',
    actions: [
      'Choose Create account; try student! and a weak password, then submit to show validation.',
      'Replace them with a unique letters-and-numbers username and a valid password.',
      'Create the demo account, or use the prepared student login.',
    ],
    cue: 'Allow roughly 30 seconds for the form interaction. If needed, the next card can prepare a sample student. Planned finish: 04:10.',
  },
  {
    feature: 5,
    chapter: 'Student profile',
    title: 'Show invalid location and academic results',
    route: '/profile',
    target: 'profile-postal',
    seconds: 35,
    student: true,
    script:
      'The student profile records the information needed for recommendations. I’ll enter an incomplete postal code and PSLE AL 35, then try to save. The form explains that these values are invalid. A PSLE aggregate must be between four and thirty-two. I’ll correct the postal code to 556000 and the score to eight. Both the client and server validate these inputs.',
    actions: [
      'Enter postal code 123 and PSLE AL 35; click Save profile to show the errors.',
      'Correct the values to postal 556000 and AL 8.',
    ],
    cue: 'Pause following while editing and saving. Keep the corrected values for the roadmap section.',
  },
  {
    feature: 5,
    chapter: 'Student profile',
    title: 'Change the target level and save',
    route: '/profile',
    target: 'profile-results',
    seconds: 30,
    student: true,
    script:
      'Changing the target level changes the academic fields. S1 Posting uses the PSLE result, while post-secondary and university transitions ask for their relevant results. I’ll return to S1 Posting with AL eight and save. The app takes me straight to the roadmap and confirms that the profile was saved. The saved postal code also becomes the default reference for distances elsewhere.',
    actions: [
      'Switch S1 Posting to JC / Polytechnic / ITE, then University.',
      'Return to S1 Posting, restore AL 8 and postal 556000, then Save profile.',
    ],
    cue: 'Show the success toast on the roadmap page. Planned finish: 05:15.',
  },
  {
    feature: 6,
    chapter: 'Bookmarks',
    title: 'Save two schools from the directory',
    route: '/directory',
    target: 'directory-results',
    seconds: 25,
    prepare: 'directory',
    student: true,
    script:
      'Back in the directory, the signed-in student can now see the Save controls that were hidden from guests. I’ll bookmark two schools. The Saved count in the header updates after each click. These bookmarks belong to the account, so the student can come back to the shortlist later.',
    actions: [
      'Click Save on two school cards.',
      'Point out the Saved count changing in the header.',
    ],
    cue: 'Use two schools that are not already bookmarked.',
  },
  {
    feature: 6,
    chapter: 'Bookmarks',
    title: 'Open and trim the shortlist',
    route: '/saved',
    target: 'saved-schools',
    seconds: 20,
    student: true,
    script:
      'The Saved page brings that shortlist together. Its cards show distances from the postal code stored in the profile and the available entry benchmark. I’ll remove one school and show the count changing again. Removing a bookmark changes the shortlist; it does not remove the school from the directory.',
    actions: [
      'Compare the two saved cards.',
      'Remove one bookmark and show the reduced header count.',
    ],
    cue: 'Planned finish: 06:00.',
  },
  {
    feature: 7,
    chapter: 'Student reviews',
    title: 'Draft and submit a review',
    route: 'school',
    target: 'school-reviews',
    seconds: 35,
    student: true,
    automation: 'review',
    script:
      'Now I’ll return to the school profile as a signed-in student. The review composer is available. I’ll enter a short example and point out the word counter as it changes. Reviews are limited to two hundred words, and one account can have one review per school. HTML tags are stripped from review text. I’ll submit this example so we can see the ownership controls.',
    actions: [
      'Watch the example review being typed and point out the word counter.',
      'Click Submit Review and show Your review.',
    ],
    cue: 'Typing is automatic only when the review box is empty. Submission remains a presenter action.',
  },
  {
    feature: 7,
    chapter: 'Student reviews',
    title: 'Edit, delete and hand over',
    route: 'school',
    target: 'school-reviews',
    seconds: 25,
    student: true,
    script:
      'I can edit my own review, and the updated version is marked “edited”. Deleting it asks for confirmation. I’ll confirm the deletion so the example is cleaned up. That completes the guest and student account features. I’ll now hand over for the education roadmap, logout and administrator demonstration.',
    actions: [
      'Choose Edit Review, change the wording, and save the update.',
      'Choose Delete Review and confirm.',
      'At 07:00, hand the phone and presentation over to presenter two.',
    ],
    cue: 'Presenter one finishes here. Keep the student signed in. Presenter two starts the next card.',
  },
  {
    feature: 8,
    chapter: 'Education roadmap',
    title: 'Start from the saved student profile',
    route: '/roadmap',
    target: 'roadmap-stage',
    seconds: 25,
    student: true,
    script:
      'I’ll continue with the education roadmap. This is the student profile we just saved: S1 Posting, PSLE AL eight and postal code 556000. The stage is already selected, and the caption confirms the inputs being used. I’ll generate the plans and then show how the student can compare, adjust and keep a pathway.',
    actions: [
      'Point out the pre-selected stage, score and postal code.',
      'Use the next card to generate the two plans.',
    ],
    cue: 'Presenter two starts at 07:00 and has seven minutes for features 8–10.',
  },
  {
    feature: 8,
    chapter: 'Education roadmap',
    title: 'Compare the two plans and their maps',
    route: '/roadmap',
    target: 'roadmap-plans',
    seconds: 45,
    student: true,
    prepare: 'generate',
    script:
      'The two plans appear side by side. The rule-based plan applies the entry rules and ranking settings. For this demonstration, the AI panel uses prepared sample recommendations, so we are not waiting on an external service. The sample is labelled on screen.\n\nEach plan lists three choices and has its own map. The numbered pins match the choice order, while the house pin marks the student’s postal district. In the live product, AI and rule generation run independently: a problem with the AI service leaves the rule-based plan usable and offers an AI retry. The student’s username is not sent to the AI model.',
    actions: [
      'Compare the school choices in the two columns.',
      'Point to the numbered map pins and house pin in each plan.',
    ],
    cue: 'Do not wait for or deliberately trigger an external AI failure. Planned finish: 08:10.',
  },
  {
    feature: 8,
    chapter: 'Education roadmap',
    title: 'Compare Grade and Distance ranking',
    route: '/roadmap',
    target: 'roadmap-rule',
    seconds: 50,
    student: true,
    prepare: 'generate',
    script:
      'Within the rule-based plan, I can choose what to rank by. Grade starts from the student’s academic result and the schools’ entry figures. Distance prioritises schools nearer the saved postal code. I’ll switch to Distance and let the audience compare the order before returning to Grade.\n\nOnly the rule-based column reloads when I change its ranking controls. The AI sample remains the same. This makes the comparison easier: I can change one decision criterion without losing the alternative plan beside it.',
    actions: [
      'Select Distance and allow the new order to settle.',
      'Compare the choices and map pins with the previous order.',
      'Select Grade again and show that the AI column stays unchanged.',
    ],
    cue: 'Pause following for the controls. Spend the full comparison time rather than clicking through immediately.',
  },
  {
    feature: 8,
    chapter: 'Education roadmap',
    title: 'Constrain the acceptable distance',
    route: '/roadmap',
    target: 'roadmap-rule',
    seconds: 40,
    student: true,
    prepare: 'generate',
    script:
      'Under Grade ranking, the student can also set an acceptable distance. I’ll move the slider to one kilometre and release it. The plan re-ranks after release, rather than making a request for every movement.\n\nIf no school meets the limit, the panel explains that and disables Save. That is different from a failed request: the chosen constraint simply leaves no result. I’ll widen the distance again so the student has choices to work with.',
    actions: [
      'Move Acceptable distance to 1 km and release.',
      'Show the empty explanation and disabled Save if there are no matches.',
      'Restore Any distance and wait for choices to return.',
    ],
    cue: 'Do not claim there are no matches if the deployed dataset does have a school within 1 km.',
  },
  {
    feature: 8,
    chapter: 'Education roadmap',
    title: 'Explain the ranking and a different stage',
    route: '/roadmap',
    target: 'roadmap-stage',
    seconds: 40,
    student: true,
    script:
      'The About dialog explains how the current rule-based ranking works, including the weights and treatment of the entry figures. I’ll open it briefly instead of asking the audience to accept an unexplained score.\n\nThe criteria also depend on the transition. For P1 Registration, there is no academic grade to rank, so the primary-school plan uses distance. I’ll demonstrate that stage, then return to S1 Posting and generate again for the saving example.',
    actions: [
      'Scroll to the rule panel, open About, and close it after showing the explanation.',
      'Choose P1 Registration and generate to show distance-only ranking.',
      'Return to S1 Posting and generate again.',
    ],
    cue: 'Pause following while moving between the stage selector and the panels. Planned finish: 10:20.',
  },
  {
    feature: 8,
    chapter: 'Education roadmap',
    title: 'Save a plan and confirm replacement',
    route: '/roadmap',
    target: 'roadmap-workspace',
    seconds: 45,
    student: true,
    prepare: 'generate',
    script:
      'Once the student has compared the choices, either plan can be saved. I’ll save this plan and show the saved roadmap with its map. The account keeps one roadmap at a time.\n\nIf I generate another plan and try to save it, the app asks whether I want to replace the existing one. I’ll show the confirmation before replacing it. This prevents a student from losing a previous choice through an unnoticed extra click.',
    actions: [
      'Save a plan and show the saved roadmap and map.',
      'Generate again and click Save Roadmap to show the overwrite confirmation.',
      'Confirm the replacement.',
    ],
    cue: 'These saves are deliberate presenter clicks. Next does not save or overwrite a roadmap.',
  },
  {
    feature: 8,
    chapter: 'Education roadmap',
    title: 'Edit choices, then delete the saved plan',
    route: '/roadmap',
    target: 'roadmap-workspace',
    seconds: 40,
    student: true,
    script:
      'A saved roadmap can still be refined. Edit Roadmap offers schools from the same stage, so a secondary-school pathway cannot accidentally be edited into an unrelated university choice. I’ll change one choice and save the update; Cancel is available if I do not want to keep the edit.\n\nFinally, Delete Roadmap asks for confirmation. I’ll remove this demonstration plan, leaving the profile ready to generate another one. That completes the roadmap lifecycle: generate, compare, save, replace, edit and delete.',
    actions: [
      'Choose Edit Roadmap, change one dropdown, and Save Changes.',
      'Show Cancel if time permits.',
      'Choose Delete Roadmap and confirm.',
    ],
    cue: 'Finish feature 8 at 11:45; retain the student session for the logout demonstration.',
  },
  {
    feature: 9,
    chapter: 'Logout',
    title: 'Return to guest access',
    route: '/roadmap',
    target: 'login',
    seconds: 35,
    prepare: 'logout',
    script:
      'I’ll now log out of the student account. The account-specific navigation disappears, and the browser returns to guest access. Requesting the protected roadmap then redirects to login with an explanation. Logging out also revokes the refresh token on the server, rather than merely hiding the menu.\n\nThe guest can continue browsing public school information, but cannot access that student’s profile, saved institutions or roadmap. Next I’ll use the separate administrator account.',
    actions: [
      'Show the guest navigation and the login notice after requesting Roadmap.',
      'If time allows, briefly show the responsive mobile menu.',
    ],
    cue: 'Entering this card logs out and requests Roadmap to show the guard. Planned finish: 12:20.',
  },
  {
    feature: 10,
    chapter: 'Administrator',
    title: 'Sign in with the administrator role',
    route: '/login',
    target: 'login',
    seconds: 20,
    script:
      'I’ll sign in using the prepared administrator account. This account lands on the Admin panel. Access is based on the stored role: a normal student cannot gain access just by entering the administrator URL. The role is checked by the server on requests to these functions.',
    actions: [
      'Enter the prepared administrator credentials and sign in.',
      'Point out the Admin panel navigation entry.',
    ],
    cue: 'Keep credentials private. If needed, pause following before entering them; resume and advance after login.',
  },
  {
    feature: 10,
    chapter: 'Administrator',
    title: 'Validate and update the school dataset',
    route: '/admin',
    target: 'admin-dataset',
    seconds: 50,
    script:
      'The update panel accepts the school CSV files. I’ll first try a non-CSV file to show that it is rejected. Then I’ll drag in the prepared CSV files and show the names and sizes before starting the update.\n\nWhile the update runs, the controls are locked and the status makes the progress clear. On success, the banner and record count confirm the result. Files are identified from their columns, so their names do not have to follow a special convention. The update is one transaction: if it fails, the change is rolled back rather than leaving a partly updated dataset.',
    actions: [
      'Try a non-CSV file and show the rejection.',
      'Drop the prepared CSV files, show their sizes, and click Update Dataset.',
      'Show Update running, then the success banner and refreshed record count.',
    ],
    cue: 'Use the separate demo database and rehearse this upload. Reserve this time for the real update, not extra narration.',
  },
  {
    feature: 10,
    chapter: 'Administrator',
    title: 'Export school data and finish the live demo',
    route: '/admin',
    target: 'admin-dataset',
    seconds: 30,
    script:
      'Finally, Export Database downloads the school records as a dated CSV file. The export covers school information; it does not include users, reviews or roadmaps. I’ll show the downloaded file so the result is visible.\n\nThat completes the ten live demonstration sections. We have finished the administrator update and export, and I’ll hand back for the next part of the presentation.',
    actions: [
      'Click Export Database and show the dated CSV download.',
      'Keep the Admin panel visible and hand back at 14:00.',
    ],
    cue: 'Presenter two finishes at 14:00. Do not add the opening pitch, SE-practices script or a repeated product recap.',
  },
]

export const presenterOf = (step: DemoStep): 1 | 2 => (step.feature <= 7 ? 1 : 2)
export const formatDemoTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
export const DEMO_TOTAL_SECONDS = DEMO_STEPS.reduce((total, step) => total + step.seconds, 0)
export function plannedWindow(index: number) {
  const start = DEMO_STEPS.slice(0, index).reduce((total, step) => total + step.seconds, 0)
  return `${formatDemoTime(start)}–${formatDemoTime(start + DEMO_STEPS[index]!.seconds)}`
}
