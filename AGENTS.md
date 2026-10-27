<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project conventions

- Preserve the existing Meet dark theme, responsive layouts, and established component patterns. Make focused changes that match the requested scope.
- Use `lucide-react` for interface icons. Avoid ad hoc Unicode symbols or hand-drawn icon markup when a library icon exists.
- Use Tailwind CSS utilities for styling. Reuse the `twCss` mappings in `src/lib/tailwind-classes.ts` for existing semantic class names; avoid adding new presentation rules to `src/app/globals.css` unless a global rule is required.
- Keep browser-only APIs and interactive behavior in Client Components. Follow the current App Router patterns and the Next.js documentation rule above.
- Keep meeting media ownership in `src/lib/media.ts` and `src/lib/use-webrtc.ts`. Camera capture should flow through `getLocalMediaStream`; turning video off must stop camera tracks and call cleanup helpers. Never send the raw camera track when a processed video stream is selected.
- Keep raw local media separate from outgoing/processed media. Background effects belong in `src/lib/background-effects.ts` and `src/lib/use-background-stream.ts`; self-host their model and WASM assets under `public/mediapipe/`.
- Keep local and remote screen-share streams distinct. Only the participant who owns the local display capture can stop it.
- Use `npm run build` to validate production builds when asked to build or verify changes. Do not add backend behavior to UI-only requests.
