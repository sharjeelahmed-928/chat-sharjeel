# chat.sharjeel.space

An open-source, account-free AI assistant. No signup, no login — open the site
and start chatting. Every conversation lives only in your browser's
`localStorage`; the server never sees or stores your chat history.

Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, and
the Gemini API.

## Features

- **No auth, ever.** An anonymous session starts the moment the page loads.
- **Local-first storage.** Conversations, messages, and settings are saved to
  `localStorage` and persist across refreshes. Nothing is sent to a database.
- **Streaming responses** from Gemini, rendered incrementally as they arrive.
- **Markdown everywhere**: headings, bold/italic, tables, ordered/unordered
  lists, blockquotes, inline code, and fenced code blocks with syntax
  highlighting (via `react-markdown` + `remark-gfm` +
  `react-syntax-highlighter`).
- **Full chat management**: new chat, rename, delete, pin, and search across
  titles and message content.
- **Auto-generated titles** derived from each conversation's first message.
- **Copy, regenerate, and stop-generation** controls on assistant messages.
- **Settings panel**: theme, default model, response length, temperature,
  clear-all, and export/import chats as JSON.
- **Light / dark / system themes**, applied with no flash-of-wrong-theme on
  load.
- **Responsive** from mobile to desktop, with a collapsible sidebar.
- **Accessible**: labeled controls, keyboard-operable inputs, visible focus
  states.
- **Resilient**: offline detection, friendly API/rate-limit/timeout error
  messages, and retry affordances.
- **Secure by design**: the Gemini API key lives only on the server; requests
  are validated, sanitized, and rate-limited before they ever reach Gemini.

## Tech stack

| Layer      | Choice                                                |
| ---------- | ------------------------------------------------------ |
| Framework  | Next.js 15 (App Router), React 19, TypeScript          |
| Styling    | Tailwind CSS, shadcn/ui-style primitives, Framer Motion |
| AI         | Google Gemini API (`streamGenerateContent`)             |
| Storage    | Browser `localStorage` (no database, no backend auth)  |
| Deployment | Vercel                                                  |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your Gemini API key

Copy the example env file and add your key:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free key at <https://aistudio.google.com/app/apikey>. This key is only
ever read on the server (inside `app/api/chat/route.ts`) — it is never sent
to or bundled into the browser.

Optional variables:

- `GEMINI_MODEL` — a fallback model id if none is supplied by the client
  (the client normally sends its own `model` from Settings).
- `RATE_LIMIT_PER_MINUTE` — requests allowed per IP per minute (default `20`).

### 3. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

### 4. Build for production

```bash
npm run build
npm run start
```

## Deploying to Vercel

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add an environment variable `GEMINI_API_KEY` in the Vercel project
   settings (Settings → Environment Variables).
4. Deploy — no other configuration is required.

## Project structure

```
app/
  api/chat/route.ts     # Server route: validates, rate-limits, and streams Gemini responses
  layout.tsx            # Root layout, fonts, no-flash theme script
  page.tsx              # Main app shell (sidebar + chat window + settings)
  globals.css           # Design tokens (light/dark) + markdown styles
components/
  Sidebar.tsx            # Chat history: search, pin, rename, delete
  ChatWindow.tsx          # Message list + auto-scroll + input
  ChatInput.tsx           # Textarea, send/stop button, keyboard shortcuts
  MessageBubble.tsx       # Single message row (user/assistant), copy/regenerate
  Markdown.tsx            # react-markdown wiring with custom code renderer
  CodeBlock.tsx           # Syntax-highlighted code block with copy button
  WelcomeScreen.tsx        # Empty-state screen with example prompts
  SettingsDialog.tsx       # Theme, model, length, temperature, export/import
  ThemeToggle.tsx          # Light/dark/system cycle button
  ui/                      # Reusable primitives (button, dialog, input, select, ...)
hooks/
  useConversations.ts    # Conversation CRUD + streaming send/regenerate logic
  useSettings.ts         # Persisted settings + theme application
lib/
  storage.ts             # localStorage read/write helpers (conversations, settings)
  gemini.ts              # Server-side Gemini streaming client
  rate-limit.ts          # In-memory per-IP rate limiter
  utils.ts               # cn(), date/time/title formatting helpers
types/
  index.ts               # Shared TypeScript types
```

## Data model (localStorage)

Two keys are used:

- `css.conversations.v1` — an array of `Conversation` objects
  (`id`, `title`, `createdAt`, `updatedAt`, `pinned`, `messages[]`).
- `css.settings.v1` — the current `AppSettings`
  (`theme`, `model`, `responseLength`, `temperature`).

Use **Settings → Export chats as JSON** to download a backup, and
**Settings → Import chats** to restore one (on this or another device/browser).

## Security notes

- The Gemini API key is read only inside the server route handler
  (`app/api/chat/route.ts`) via `process.env.GEMINI_API_KEY` — it is never
  exposed to client-side code or the network response.
- Incoming requests are validated (message shape, count, and length limits)
  and lightly sanitized (control-character stripping) before being forwarded.
- A simple in-memory, per-IP rate limiter guards against casual abuse. For
  a high-traffic production deployment on multiple serverless instances,
  swap this for a durable store such as Upstash Redis.

## Notes on the in-memory rate limiter

Because Vercel serverless functions are ephemeral and can scale across
multiple instances, the bundled rate limiter resets between cold starts and
isn't shared across instances. It's intentionally dependency-free per the
project's constraints; for stricter guarantees at scale, replace
`lib/rate-limit.ts` with a call to a shared store.

## License

MIT — do whatever you'd like with this.
