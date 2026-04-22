# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Install dependencies
```sh
npm install          # installs root + all task dependencies in parallel
```

### Build the extension
```sh
npm run build                        # builds VSIX with default version v0.0.0
node ./scripts/build.js -- v1.2.3    # builds with a specific version
```
The VSIX output lands in `dist/`.

### Lint and test
```sh
npm test             # runs ESLint + all task unit tests in parallel
npm run test:js      # ESLint only (root)
npm run test:tasks   # Mocha unit tests for every task

# Run tests for a single task (e.g. SheriffApply):
npm --prefix tasks/SheriffApply/SheriffApplyV0 test
```

## Architecture

### Extension structure
This is an Azure DevOps task extension (VSIX) containing three pipeline tasks:

| Task | Path | Purpose |
|------|------|---------|
| `InstallSheriffCLI` | `tasks/InstallSheriffCLI/InstallSheriffCLIV0/` | Downloads and installs the Sheriff CLI binary onto the agent |
| `SheriffPlan` | `tasks/SheriffPlan/SheriffPlanV0/` | Runs `sheriff plan [mode]` |
| `SheriffApply` | `tasks/SheriffApply/SheriffApplyV0/` | Runs `sheriff apply [mode]` |

Each task is an independent npm package under `tasks/<TaskName>/<TaskName>V0/` with its own `package.json`, `task.json`, `src/index.js`, and `test/unit/index.test.js`.

### Task internals
- **Entry point**: `src/index.js` using `azure-pipelines-task-lib` to read inputs and interact with the pipeline.
- **Authentication**: `SheriffPlan` and `SheriffApply` both support Workload Identity Federation (OIDC) and Service Principal (key) auth. Auth logic sets `AZURE_*` environment variables consumed by the Sheriff CLI.
- **Inputs** are declared in `task.json` and read via `tl.getInput()` / `tl.getBoolInput()`.

### Build pipeline (`scripts/build.js`)
The build script:
1. Copies the project into a temp directory.
2. Runs `npm ci` for root and each task.
3. Syncs the version from the root `package.json` into each `task.json`.
4. Invokes `tfx extension create` to produce the VSIX.

### Versioning
Task versions are set in each task's `package.json`. The build script propagates these into `task.json` automatically. The extension manifest (`vss-extension.json`) version is set by the build script from the CLI argument.

### CI/CD
- `.github/workflows/ci.yml` — runs on every push/PR, calls the reusable `build.yml` with no version (defaults to `v0.0.0`).
- `.github/workflows/build.yml` — reusable workflow: installs, tests, builds, uploads VSIX artifact.
- `.github/workflows/release.yml` — triggered by tag push; builds with the tag version, creates a GitHub release, and publishes to the Visual Studio Marketplace (requires the `VISUAL_STUDIO_MARKETPLACE_TOKEN` secret and `visual-studio-marketplace` environment approval).
