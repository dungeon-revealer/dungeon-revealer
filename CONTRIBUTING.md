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
All files under `src_ts` are written in TypeScript it will be built to the `src` folder.

All new features should be built using TypeScript.
Existing features can be ported over to TypeScript by adding the corresponding `src` filtes to the `.gitignore` and moving them over to the `src_ts` folder while keeping the path and changing the file extension to `ts/tsx`. Once the migration is done we can simply rename the `src_ts` folder to `src`.

In order to compile the typescript files to javascript you can use the `yarn build:ts` command. For watch mode use `yarn build:ts --watch`.

In case you want to help porting features over to TypeScript, feel free to open an issue or pull request.
