# Contributing

Install dependencies:

- `yarn install`

Run the react development server:

- `yarn start:dev` (visit `localhost:3001`)

Run the backend:

- `yarn start` (available on `localhost:3000`)

Compile executables:

- `yarn compilex64` for x64 machines (most computers).
- `yarn compilearm` for armv7 machines (Raspberry Pi and other single board computers).

The executables are located in the bin folder.

## TypeScript Migration

We are currently in the process of migrating the code base partially to TypeScript.
All new files under `src` should be written in TypeScript.

All new features should be built using TypeScript.
Existing features can be ported over to TypeScript by adding changing the file extension from `.js` to `.ts`/`.tsx`.

In case you want to help porting features over to TypeScript, feel free to open an issue or pull request.
