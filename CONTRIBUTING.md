# Contributing

## Required Software

Make sure you have the following software installed:

- Node.js 16 (verify with `node --version`)
- npm 7 (verify with `npm --version`)

## Setting up the project

Install dependencies:

- `npm install`

Build the backend & frontend:

- `npm run build`

Run the react development server:

- `npm run start:frontend:dev` (visit `localhost:3001`)

Run the backend:

- `npm run start:server:dev` (available on `localhost:3000`)

Compile executables:

- `npm run compile` for darwin and unix systems (most computers).
- `npm run compile:win` for windows systems.

The executables are located in the bin folder.

## TypeScript Migration

We are currently in the process of migrating the code base to TypeScript.
All new files under `src` and `server` should be written in TypeScript.

All new features should be built using TypeScript.
Existing features can be ported over to TypeScript by adding changing the file extension from `.js` to `.ts`/`.tsx`.

In case you want to help porting features over to TypeScript, feel free to open an issue or pull request.
