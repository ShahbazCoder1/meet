<p align="center">
  <img src="public/icon.svg" width="72" height="72" alt="Meet logo">
</p>

<h1 align="center">Meet</h1>

<p align="center">A focused video meeting app for quick conversations and shared work.</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.4.3-black?logo=next.js&logoColor=white" alt="Next.js 16.4.3"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.3.0-149eca?logo=react&logoColor=white" alt="React 19.3.0"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4"></a>
  <a href="https://peerjs.com/"><img src="https://img.shields.io/badge/PeerJS-1.5-ef8e75" alt="PeerJS 1.5"></a>
</p>

Meet provides a dark, meeting-first workspace with a dashboard for starting or joining calls and a responsive meeting room for participants.

## Demo Video

https://github.com/user-attachments/assets/9742440b-04dd-48b0-80c5-1f2ab051ea9e

## Features

- Start a new room or join with a meeting link
- Preview and control your microphone and camera
- Choose available audio and video input devices
- Share your screen
- Use in-room chat and participant list
- Adapt the meeting layout for desktop and mobile screens

## Requirements

- Node.js compatible with the installed Next.js version
- npm
- A modern browser with camera and microphone access for calling features

Camera and microphone access requires HTTPS in deployed environments. Browsers allow these permissions on `localhost` during development.

## Getting started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production server |
| `npm run lint` | Run ESLint |

## Project structure

```text
src/
  app/          App Router pages and the room API route
  components/   Dashboard, meeting room, and shared UI components
  lib/          WebRTC, media, meeting data, and Tailwind utilities
public/
  icon.svg      Meet brand icon
```

## Deployment notes

The app uses PeerJS for peer-to-peer media and an API route for room presence. The current room roster is stored in process memory. Deployments that run multiple server instances need shared storage for consistent room discovery.

For Next.js deployment options, see the [Next.js deployment guide](https://nextjs.org/docs/app/building-your-application/deploying).
