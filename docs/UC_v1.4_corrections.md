# Use Case Descriptions v1.4: corrections to make

`docs/WIP_for_coming_labs/Use Case Descriptions.pdf` has no editable source in this repo, so
these fixes could not be applied here. Apply them in the Word file, then
export the PDF again. Each item gives the current wording, the wording that matches the shipped app,
and the file that shows it.

The SRS, Dialog Map, guides, Data Dictionary, Demo Script and architecture notes already carry the
corrected behaviour.

## Behaviour that changed or was never described correctly

| Use case | Current text | Replace with | Evidence |
| --- | --- | --- | --- |
| UC-3.1 steps 4 to 6 | The Rule-Based Plan controls ("Rank by", slider) are shown and changed **before** "Generate Roadmap" is clicked | Step 4: the user optionally changes the target transition stage. Step 5: clicks "Generate Roadmap". After the plans are shown, add: "Inside the Rule-Based Plan panel the system shows an 'About' button and, for stages that offer both options, a 'Rank by' choice (Distance or Grade, Grade by default) and, when Grade is selected, an 'Acceptable distance' slider." AF-S10c already covers re-ranking | `client/src/views/RoadmapView.vue` (panels only exist once `generated`), `RulePlanPanel.vue` |
| UC-3.1 step 4 | slider "1 km to 20 km, in 1 km steps" | "1 km to 19 km in 1 km steps, then Any distance at the top end of the slider, which sets no limit" | `client/src/data/ruleSort.ts` (`DISTANCE_LIMIT`) |
| UC-2.3 step 4 | "The system redirects the guest user to root." | "...redirects the guest user to the School Directory." | `client/src/components/layout/NavLinks.vue` (`logOut`) |
| UC-2.7 AF-S3 | "If there are no postal code saved, the system omits the distance." | "...the card shows 'Add postal code' in place of the distance." (the code now behaves this way; before, the Saved page measured from the sample code 556000) | `client/src/views/SavedView.vue` |
| UC-2.7 step 3, benchmark bullet | "Primary Entry Benchmark for the school's tier (e.g., PSLE AL range, JAE cut-off point, or Polytechnic IGP GPA)" | "The entry benchmark the dataset has for the tier: places taken up to Phase 2B (primary) or the 2017 PSLE T-score cut-off (secondary). Post-secondary and university cards show 'Not available'; their multi-year figures are on the school profile." | `client/src/services/schoolService.ts` (`benchmarkOf`) |
| UC-1.1 step 6 and SEC-4 | "validates and sanitizes user input and queries the database"; "sanitize the user input on the backend" | "validates and sanitizes the keyword in the browser and filters the tier's school list, which the browser has already fetched"; "SEC-4: the keyword is cleaned in the browser and never sent to the server" | `client/src/stores/directory.ts`, `client/src/utils/searchQuery.ts` |
| UC-1.1 assumptions | (nothing about the starting postal code) | Add: "Until the student saves a postal code, the Distance box starts from a sample postal code (556000)." | `client/src/stores/directory.ts` (`DEFAULT_POSTAL`) |
| UC-1.2 step 3, Location | "nearest MRT station with line code, nearest bus stops with stop name, 5-digit stop code and service numbers" | "nearest MRT station (with its line code where the dataset gives one) and the bus service numbers. The dataset has no bus stop names or stop codes." | `server/data/raw/general.csv` |
| UC-1.2 step 3, Location Map | pin at the school's location | add "and, when the reference postal code can be located, a house pin at the centre of its postal district" | `client/src/components/schools/SchoolLocationCard.vue` |
| UC-1.2 step 3 | lists identity, location, courses, fees, aid, scholarships, statistics, map, reviews | also list: subjects, CCAs and MOE programmes; principal, telephone, email and website | `SchoolIdentityCard.vue`, `SchoolProgrammes.vue` |
| UC-4.1 assumption 2 and AF-S5 | "The review form is visible to guest users, but submission requires authentication"; the system "blocks the submission (HTTP 401)" | "Guests do not see the review box. They see 'Reviews are open to account holders only' and a 'Write a review' button that opens the warning modal 'Please log in or create an account to post a review.' The server still answers HTTP 401 to an unauthenticated request." | `client/src/components/reviews/ReviewSection.vue` |
| UC-5.1 steps 3 and 4, AF-S4b | one CSV file is selected, validated (type, non-empty, 20 MB) and named | "one or more CSV files"; each is checked for .csv and not empty when it is chosen, and listed with its size; the 20 MB limit is checked per file when the update starts | `client/src/utils/datasetFiles.ts`, `server/core/dataset_update.py` |
| UC-5.1 AF-S4a | a file that is not .csv, is empty or exceeds 20 MB gets the inline error "Invalid file..." | A file that is not .csv, or is empty, is left out of the list with a note ("<name> is not a CSV file, so it was left out." / "<name> is empty, so it was left out."). Only a file over the size limit gets the inline error "Invalid file. Please upload a non-empty .csv file within the size limit." | SRS REQ-5.8, `CsvDropZone.vue` |
| UC-5.1 assumption 2, UC-5.2 assumption 1 | "The administrator role is assigned directly in the database." | "The administrator role is given from the server with `python -m scripts.make_admin <username>`." | `server/scripts/make_admin.py` |

## Failure messages: "popup" is wrong outside the admin flows

Every "EX-1: The database is unreachable. The system will create a popup..." (and the matching
postconditions that say "shows a popup error") is only true for UC-5.1 and UC-5.2. Elsewhere the app
shows an inline message or a banner, as the Dialog Map and SRS REQ-4.12 already say. The text in all
cases is "Unable to complete your request at this time. Please try again later." unless noted.

| Use case | Where the message appears |
| --- | --- |
| UC-1.1 | Inline alert in place of the list: "Unable to load the <tier> schools at this time. Please try again." with a "Try again" button (the list is not an empty table) |
| UC-1.2 | Inline alert: "Unable to load this school at this time. Please try again." with "Try again" |
| UC-2.1, UC-2.2 | Inline error on the form |
| UC-2.4 | Inline message beside the academic fields |
| UC-2.5, UC-2.6, UC-2.7 | Banner under the header; the list stays as it was |
| UC-3.1 | Inside the plan panel for a failed plan; banner for a failed save |
| UC-3.2, UC-3.3, UC-3.4 | Banner under the header; the saved roadmap stays as it was |
| UC-4.1, UC-4.3 | Inline error under the review box |
| UC-4.2 | Inline alert in the review section |
| UC-4.4 | Banner under the header |

## Document hygiene

- Page headers read "Use Cases for <Project>" / "<project>"; they should say PathSG.
- The v1.4 revision history has two overlapping rows with different lists of revised use cases.
  Merge them (the per-use-case "Date Last Updated" fields support the second list).
- The use case diagram shows UC-2.4.1, UC-2.4.2 and UC-3.1.1, which have no description of their
  own. Either describe them or fold them into UC-2.4 and UC-3.1 in the diagram.
- SRS section 4.7 (Home Page, REQ-7.1 and REQ-7.2) has no use case. Add one, for example
  "UC-1.3 View Home Page" for all users, and put it in the diagram.
