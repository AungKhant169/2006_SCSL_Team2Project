# Present PathSG from your phone

The `demo` branch publishes both images with the `:demo` tag. The audience sees the actual
PathSG app. The phone shows a 23-step script adapted from
`docs/WIP_for_coming_labs/PathSG_Demo_Script.docx`, with Next, Back, a running order, elapsed time,
script size, spotlight, pause, refocus, restart and end controls.

## Deploy

Use Docker Compose 2.24.4 or newer (`!override` replaces the normal HTTP port):

```sh
cp .env.example .env.demo
# Set a unique SECRET_KEY in .env.demo (at least 32 characters).
docker compose --env-file .env.demo -p pathsg-demo -f docker-compose.yml -f docker-compose.demo.yml pull
docker compose --env-file .env.demo -p pathsg-demo -f docker-compose.yml -f docker-compose.demo.yml up -d --wait
```

To build the checkout locally, replace `pull` with `build`. This runs the `:demo` client and server
on port **8081**, with a separate Compose network and `pathsg-demo_pathsg-data` database volume.
The regular `pathsg` project and `:latest` images are independent. Keep `-p pathsg-demo` on all demo
commands. The server imports the bundled school data into an empty demo database on first start.

Optional `.env.demo` settings:

| Setting | Purpose |
| --- | --- |
| `DEMO_HTTP_PORT=8081` | Demo HTTP port |
| `DEMO_PUBLIC_ORIGIN=https://demo.example.com` | Origin for a hosted demo behind an HTTPS proxy |
| `OPENAI_API_KEY=…` | Enables real AI outside paired demos; the presentation uses a prepared sample |
| `IMAGE_PREFIX=…` | Registry namespace when using a fork |

The demo API defaults to disabled; only the demo Compose override sets `DEMO_ENABLED=true`.
Use the same single-worker server configuration as the normal deployment. Polling uses ordinary
HTTP through the existing `/api` proxy, so no WebSocket proxy changes are needed.

## Pair and present

1. Open `http://<laptop-wifi-ip>:8081/demo` on the laptop, or use the deployed HTTPS address.
2. Click **Start demo session**. Scan the QR code with your phone. Both devices must be able to
   reach the same site. If using localhost on the laptop, change the pairing address to its Wi-Fi
   IP and port before scanning; localhost on a phone points at the phone itself.
3. Click **Open audience display** on the laptop. Share this browser window with the audience.
4. Press **Next feature** on the phone. The laptop navigates, scrolls and outlines the feature;
   the phone advances the private script. Readiness and reconnect messages appear on the phone.
   The spotlight and page scroll travel together, with a short fade between pages. Next becomes
   available when the focus has settled. Reduced-motion preferences make these changes immediate.
5. Use **Pause following** to explore manually. **Resume following** returns to the current
   feature; **Refocus display** restores a feature after manual navigation. The running order
   jumps directly to any step. Left/right arrows and Space also work on the remote.
6. **End session** disconnects both devices. **Leave demo** only detaches that display.

The phone requests a screen wake lock where the browser supports it. Otherwise, extend your
phone’s screen timeout before presenting. Mobile controls remain fixed while the script scrolls.

## Sample student and administrator

If the display is signed out when entering a student step, it registers a randomly named sample
student through the normal API, saves PSLE AL 8 and postal code 556000, and bookmarks the first two
primary schools. These records live only in the demo database. It never replaces the profile of
an existing signed-in account. Start signed out for the prepared example; use your own prepared
student if you prefer. Sample accounts remain in the demo database after the session ends.

Entering the generation step calls the real rule generator once, unless plans are already
generated. In a paired display, the AI panel immediately uses a fixed sample ordering of real
schools from the local catalogue. It is labelled **Demo sample**, needs no API key, and never calls
the external AI service. Maps and saving use the actual school IDs. Unpaired site visits retain
real AI generation. Further changes
to rankings, reviews, saved roadmaps and CSV uploads are deliberate interactions on the laptop.
Next never submits a review, saves a roadmap, uploads data, or grants administrator access.

The administrator step requires an existing administrator account. Pause following, sign out of
the student account and sign in as the administrator on the laptop, then resume/refocus. To promote
an account registered in the demo database:

```sh
docker compose --env-file .env.demo -p pathsg-demo -f docker-compose.yml -f docker-compose.demo.yml exec server python -m scripts.make_admin <username>
```

The bundled benchmark CSV has no historical rows; import the prepared benchmark dataset to show
history. OneMap needs internet. Keep the SRS and diagrams ready for the engineering segment.

## Session lifecycle

Each session has separate random display and controller keys. They travel in URL fragments when
pairing and bearer headers for API requests. The display key cannot change or end a session. QR
codes are generated locally. Keep the phone pairing link private: anyone holding it can control
that presentation. Commands use a version to reject stale or duplicate advances.

Connections retry after a network interruption. The laptop keeps its pairing in session storage
across refreshes; the phone can refresh its original link. Sessions expire after four hours and
are held in server memory, so an API restart requires a new pairing. Ending a session immediately
invalidates both keys. The service caps active sessions and rate-limits creation.

## Publish

Push the `demo` branch. `.github/workflows/publish.yml` runs the existing CI and then publishes
`client:demo` and `server:demo`, plus immutable `sha-…` tags, for amd64 and arm64. This branch does
not publish `latest`. Pull and recreate the demo Compose project to use a newly published build.
