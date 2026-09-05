# Prank Call

A web app where you sign up, get assigned a permanent (fake) phone number, and
then "prank call" other online users of the site through real, live
browser-to-browser voice — no actual telephone network, real phone numbers,
or real calls are involved anywhere in this project. Everything happens
between browsers of people using this website.

Built with:
- **Next.js 14** (App Router) — hosted on **Vercel**
- **Neon** (serverless Postgres) — accounts, assigned numbers, call history
- **Firebase Realtime Database** — who's online, ringing/call signaling
- **WebRTC** — the actual live audio between two (or more) browsers

---

## 1. What you're getting, honestly

This is a real, working app, but a couple of things are worth knowing up
front:

- **The "phone numbers" are not real phone numbers.** They're randomly
  generated, formatted like US numbers, always using the `555` exchange
  (the block reserved in North America for fictional numbers) so there is
  zero chance of colliding with a real, working line. They only exist inside
  this app's database.
- **Calls are real WebRTC voice calls between two browser tabs**, not phone
  calls. Whoever is signed into a given "number" is who answers.
- **WebRTC needs a working microphone and mic permission** in the browser.
  Most of the time a direct connection works fine; on some strict
  networks (corporate Wi-Fi, some mobile carriers) a relay server (TURN) is
  needed to get audio through. This project ships with Google's free STUN
  servers plus a free public TURN relay ([Open Relay
  Project](https://www.metered.ca/tools/openrelay/)) already wired in, at no
  cost and no signup — see the "Improving call reliability" section below if
  you ever want to swap in your own.
- **Group calls ("add to call") use a mesh** — every participant connects
  directly to every other participant. This works great for 2–4 people. It's
  not built for large group calls (that would need a media server, which
  isn't a free/simple thing to self-host).
- The in-call **keypad** plays a local touch-tone beep for feel — since
  there's no real telephone network here, it doesn't transmit anything to
  the other person.

---

## 2. Project structure

```
prank-call/
  app/                Next.js pages + API routes
  components/         UI components
  hooks/               useCallEngine (WebRTC + signaling), presence directory
  lib/                 db, auth, firebase, phone number helpers
  db/schema.sql        Run this once in Neon
  public/audios/       Put ringing.mp3 here (see step 5)
  middleware.js         Protects logged-in-only pages
```

---

## 3. Set up Neon (the database)

1. Go to [neon.tech](https://neon.tech) and sign up (free tier is enough).
2. Create a new project (any name/region is fine).
3. Once it's created, go to the project **Dashboard** and find **Connection
   Details**. Select **Pooled connection**, copy the full connection string —
   it looks like:
   ```
   postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```
4. In the Neon dashboard, open the **SQL Editor**, paste in the entire
   contents of `db/schema.sql` from this project, and run it. This creates
   the `users` and `calls` tables.
5. Save that connection string — you'll paste it into `DATABASE_URL` in
   step 6.

That's the whole Neon setup. No ORMs, migrations tools, or extra
installs needed.

---

## 4. Set up Firebase (live presence + call signaling)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
   and create a new project (the free "Spark" plan is all you need).
2. In the left sidebar, go to **Build → Realtime Database**, click **Create
   Database**, choose a location, and start in **locked mode** (we'll set
   real rules in a moment).
3. Go to **Build → Authentication → Get started**, click the **Sign-in
   method** tab, and enable **Anonymous**. (This app never shows a Firebase
   login screen to the user — it silently signs each browser in anonymously
   in the background just so the database rules below can tell "someone
   using the app" apart from a random visitor.)
4. Back in **Realtime Database → Rules**, replace the rules with:
   ```json
   {
     "rules": {
       "presence": {
         ".read": "auth != null",
         ".write": "auth != null"
       },
       "calls": {
         ".read": "auth != null",
         ".write": "auth != null"
       },
       "incoming": {
         ".read": "auth != null",
         ".write": "auth != null"
       }
     }
   }
   ```
   Click **Publish**.
5. Go to **Project settings** (gear icon) → **General** → scroll to **Your
   apps** → click the **Web** icon (`</>`) to register a new web app (you
   don't need Firebase Hosting, just registering the app). Give it any
   nickname.
6. Firebase will show you a config object like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com",
     projectId: "your-project",
     appId: "1:xxxx:web:xxxx",
   };
   ```
   You'll copy these five values into your environment variables in the next
   step. (There's no "secret" here to protect — Firebase web config is
   meant to be public; the Rules you set in step 4 are what actually secure
   the data.)

---

## 5. Add the ringing sound

Add an MP3 of a single phone ring (just one ring, not pre-looped) at:

```
public/audios/ringing.mp3
```

The app loops it automatically while a call is dialing out, so the file
itself just needs to be one ring.

---

## 6. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (step 3) |
| `JWT_SECRET` | Any long random string — generate one with `openssl rand -base64 48` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app config (step 4) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app config |

---

## 7. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, pick a number,
and you're in. To actually test a call, open a second private/incognito
window (or a different browser), sign up for a second account, and call
between the two.

---

## 8. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/prank-call.git
git push -u origin main
```

(`.env.local` is already in `.gitignore` — your secrets never get committed.)

---

## 9. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com), sign in, click **Add New →
   Project**, and import the GitHub repo you just pushed.
2. Vercel auto-detects Next.js — you don't need to change any build
   settings.
3. Before deploying, open **Environment Variables** and add every variable
   from your `.env.local` (same names, same values):
   `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_FIREBASE_API_KEY`,
   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_DATABASE_URL`,
   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
4. Click **Deploy**. Once it finishes, Vercel gives you a live URL — that's
   your site.

Any time you `git push`, Vercel redeploys automatically.

---

## 10. How the pieces fit together (for your own reference)

- **Accounts & numbers** live in Neon. Signing up creates a row in `users`;
  picking a number sets `phone_number` on that row permanently.
- **Who's online right now** lives in Firebase Realtime Database, at
  `presence/<number>`, updated live as people open/close the app or start/end
  calls (using Firebase's `onDisconnect` so someone closing their laptop lid
  is correctly shown as offline).
- **Calling** creates a node under `calls/<callId>` and an entry under
  `incoming/<calleeNumber>/<callId>` that makes the "Prank Caller is
  calling" toast pop up for the other person. Accepting/declining updates
  that call's status, which the caller is listening for.
- **The actual audio** is peer-to-peer WebRTC. Firebase is only used to pass
  the connection setup messages (SDP offers/answers and ICE candidates)
  between the two browsers — once connected, audio never touches Firebase or
  your server, it flows directly between the two participants (or through
  the TURN relay if a direct path isn't possible).
- **Call history** is written to Neon's `calls` table whenever a call ends,
  is declined, isn't answered, or the target is busy.

---

## 11. Improving call reliability (optional)

The free [Open Relay Project](https://www.metered.ca/tools/openrelay/) TURN
server used by default is public and shared, so it can occasionally be slow
or unavailable. If you notice calls that ring and connect but have no audio
(usually a sign both sides are behind strict/symmetric NATs and the direct
STUN connection failed), you can swap in your own free TURN credentials from
a service like [Metered.ca](https://www.metered.ca/) (free tier) or
[Twilio's Network Traversal Service](https://www.twilio.com/docs/stun-turn)
by editing the `ICE_SERVERS` array near the top of
`hooks/useCallEngine.js`.

---

## 12. Troubleshooting

- **"No one else is online"** — you need at least two accounts/browser
  sessions signed in at once to test calling.
- **No audio during a call** — check the browser actually granted
  microphone permission (look for a mic icon in the address bar), and try
  a different network if you're on a restrictive corporate/school Wi-Fi.
- **Numbers page never loads / spins forever** — double-check your
  `NEXT_PUBLIC_FIREBASE_*` env vars and that Realtime Database rules were
  published (step 4).
- **Signup/login fails** — double-check `DATABASE_URL` and that you ran
  `db/schema.sql` in the Neon SQL editor.
