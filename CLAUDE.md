# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pascal Editor V2 — a 3D building editor built with React Three Fiber and WebGPU. Turborepo monorepo managed with **Bun**.

## Commands

```bash
bun install          # Install dependencies
bun dev              # Build packages + start Next.js editor dev server (port 3002)
bun build            # Build all packages via Turbo
bun lint             # Biome lint
bun lint:fix         # Biome lint with auto-fix
bun format           # Biome format with write
bun check-types      # TypeScript type checking via Turbo

# Build a specific package
turbo build --filter=@pascal-app/core
turbo build --filter=@pascal-app/viewer

# Apps/editor has its own type check (includes next typegen)
cd apps/editor && bun run check-types
```

Always run `bun dev` from root so package watchers are active for hot reload.

## Architecture

### Package Dependency Graph

```
apps/editor (Next.js 16)
  ├── @pascal-app/core     (schema, state, systems, spatial logic)
  ├── @pascal-app/viewer   (3D canvas, renderers, viewer systems)
  ├── @pascal-app/editor   (editor UI components package)
  └── @repo/ui             (shared UI components)

@pascal-app/viewer → depends on @pascal-app/core (peer)
@pascal-app/core   → no internal deps (pure logic, no React Three.js in core)
```

### Three Stores

| Store | Package | Purpose |
|-------|---------|---------|
| `useScene` | `@pascal-app/core` | Scene data: flat node dictionary, CRUD, dirty tracking. Persisted to IndexedDB, undo/redo via Zundo. |
| `useViewer` | `@pascal-app/viewer` | Presentation state: selection path, camera/level/wall mode, theme, display toggles. |
| `useEditor` | `apps/editor` | Editor state: active tool, phase (`site`/`structure`/`furnish`), mode (`select`/`edit`/`delete`/`build`). |

### Data Flow

```
User input → Tool (apps/editor/components/tools/)
  → useScene mutations (createNode/updateNode/deleteNode)
  → Node marked dirty
  → Core systems recompute geometry (useFrame)
  → Renderers re-render THREE meshes
  → useViewer updates selection/hover
```

### Nodes

All scene nodes are stored in a **flat dictionary** (`Record<id, AnyNode>`) with hierarchy via `parentId`. Node types are Zod schemas in `packages/core/src/schema/nodes/`.

**Always create nodes with `.parse()`** — never construct raw objects:
```ts
const wall = WallNode.parse({ start: [0, 0], end: [5, 0] })
useScene.getState().createNode(wall, levelId)
```

Node hierarchy: Site → Building → Level → (Wall, Slab, Ceiling, Roof, Zone, Scan, Guide) → Item.

### Systems vs Renderers

- **Systems** (`packages/core/src/systems/` and `packages/viewer/src/systems/`): React components returning `null`, run logic in `useFrame`. Core systems are pure geometry generation; viewer systems handle Three.js side-effects (level visibility, cutouts).
- **Renderers** (`packages/viewer/src/components/renderers/`): Create Three.js objects, register with `useRegistry`, emit events via `useNodeEvents`. No geometry generation, no editor imports.

### Scene Registry

`useRegistry(nodeId, type, ref)` maps node IDs to live THREE.Object3D refs. Systems look up objects via `sceneRegistry.nodes.get(id)`.

### Event Bus

Typed mitt emitter. Event keys: `<nodeType>:<suffix>` (e.g., `wall:click`, `item:enter`). Renderers emit; tools/systems listen. Always clean up listeners in useEffect.

## Critical Rules

### Viewer Isolation

`@pascal-app/viewer` must **never** import from `apps/editor`. The viewer is controlled via props, callbacks, and children injection. If a feature is editor-specific, keep it in `apps/editor` and inject as a `<Viewer>` child.

Before adding to `packages/viewer`, ask: does this make sense in a read-only context?

### Tool Conventions

- Tools live in `apps/editor/components/tools/` — one component per tool.
- Tools **only mutate `useScene`** — no direct Three.js API calls.
- Preview/ghost geometry is local to the tool, not in the scene store.
- Clean up incomplete nodes on unmount.
- New tool: create component → register in `ToolManager` → add to `useEditor` tool union.

### Node Schema Conventions

- Schemas live in `packages/core/src/schema/nodes/` — never in viewer or editor.
- Always `.parse()` to create (auto-generates typed IDs like `wall_abc123`).
- New node types must be added to `AnyNode` union in `packages/core/src/schema/types.ts`.
- Use `updateNode(id, { ... })` for partial updates.

### Three.js Layers

- `SCENE_LAYER` (0): Regular geometry
- `EDITOR_LAYER` (1): Editor helpers
- `ZONE_LAYER` (2): Zone overlays (post-processing)

Never hardcode layer numbers. Keep SCENE/ZONE in viewer, EDITOR in editor app.

### Selection

Two-layer architecture: **Viewer SelectionManager** (hierarchical path: Building → Level → Zone → Elements) and **Editor SelectionManager** (phase-aware). Outliner arrays are mutated in-place.

### Spatial Queries

`useSpatialQuery()` hook validates placements: `canPlaceOnFloor`, `canPlaceOnWall`, `canPlaceOnCeiling`. Always pass `[item.id]` in `ignoreIds`, use `adjustedY` from return value.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D | Three.js (WebGPU), React Three Fiber, Drei |
| Framework | Next.js 16, React 19 |
| State | Zustand 5 + Zundo |
| Validation | Zod 4 |
| UI | Radix UI, Tailwind CSS 4 |
| Database | Supabase PostgreSQL + Drizzle ORM |
| Auth | better-auth |
| Tooling | Biome, TypeScript 5.9, Turborepo, Bun |
