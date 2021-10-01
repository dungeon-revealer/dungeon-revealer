# Contributing

This document will help you setting up this project on your machine for development. If you just want to use dungeon-revealer we recommend using the docker images or prebuilt binaries. [See the release section for more information](https://github.com/dungeon-revealer/dungeon-revealer/releases).

## Required Software

Make sure you have the following software installed:

- Node.js 16 (verify with `node --version`)
- npm 7 (verify with `npm --version`)

## Setting up the project

These are the most important commands for getting the dev server up and running.

### Install dependencies

```bash
npm install
```

### Build backend and frontend

```bash
npm run build
```

### Run built application

```bash
npm run start
```

### Run application in dev mode

The server and frontend will be reloaded/restarted once the code has been modified.

Run the backend server:

```bash
npm run start:server:dev
```

Run the react development server:

```bash
npm run start:frontend:dev
```

visit `http://localhost:4000`

## Compile executables for distribution

We use caxa for bundling the built project as a binary. The built binaries can be found in the `bin` folder.

### Unix and darwin

```bash
npm run compile
```

### Windows

```bash
npm run compile:win
```

The executables are located in the bin folder.

## TypeScript Migration

We are currently in the process of migrating the code base to TypeScript.
All new files under `src` and `server` should be written in TypeScript.

All new features should be built using TypeScript.
Existing features can be ported over to TypeScript by adding changing the file extension from `.js` to `.ts`/`.tsx`.

In case you want to help porting features over to TypeScript, feel free to open an issue or pull request.
