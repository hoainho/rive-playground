# Rive Playground

**v1.1.0 — "Living Canvas"**

> *Where your animation goes from a file to a living product.*

Inspect, validate, control, and ship Rive `.riv` animation files — from the terminal, AI assistants, or a visual playground. The complete toolchain for teams that build with Rive at scale.

---

## What's New in v1.1.0 — "Living Canvas"

| Area | Feature |
|------|---------|
| Parser | Animation `loopType` — oneShot / loop / pingPong |
| Parser | `workStart` / `workEnd` frame range per animation |
| Parser | ViewModel extraction — real data from `viewModelCount()` / `getProperties()` |
| Parser | DataEnum extraction — full enum names and values |
| CLI | `list-assets` — enumerate embedded/CDN images, fonts, audio |
| CLI | `init` — scaffold `.rive-playground/` project directory |
| CLI | `contract-generate` — generate `.rive-contract.yaml` from .riv |
| CLI | `contract-validate` — validate .riv against contract (CI-friendly) |
| CLI | `generate-platform` — codegen for Swift, Kotlin, JSON Schema, Zod, Dart |
| CLI | `compare` — diff two .riv files, detect breaking changes |
| MCP | 5 new tools: `list-rive-assets`, `generate-rive-contract`, `validate-rive-contract`, `generate-platform-types`, `compare-rive-files` |
| Playground | Events Log Panel — real-time Rive event stream |
| Playground | Preset Library — save/load/apply named configurations |
| Playground | URL deep-linking — `?file=<url>&artboard=Main&sm=...` |
| Playground | Keyboard shortcuts — Space play/pause, R reset, Ctrl+S save preset |
| Playground | Error toasts — surface silent failures visually |
| Infra | Vitest test suite (16 tests) |
| Infra | `.rive-playground/` project config directory |

---

## Overview

```
rive-analyzer CLI     Terminal-first inspection, codegen, validation
MCP Server            AI assistant integration (Claude, OpenCode)
Rive Playground       Visual editor + preset library + event log
.rive-playground/     Project config — presets, contracts (git-trackable)
```

---

## Installation

```bash
cd /path/to/rive-mcp-analyzer
npm install
npm run build
npm link           # optional: global CLI install
```

---

## CLI Reference

### inspect
```bash
rive-analyzer inspect ./animation.riv
rive-analyzer inspect ./animation.riv --json
```

### scan
```bash
rive-analyzer scan ./public/
```

### validate
```bash
rive-analyzer validate ./animation.riv ./src/constants/rive.ts
```

### generate-types
```bash
rive-analyzer generate-types ./animation.riv -o ./src/rive-generated.ts
```

### generate-platform
```bash
rive-analyzer generate-platform ./animation.riv --target swift
rive-analyzer generate-platform ./animation.riv --target kotlin -o RiveConstants.kt
rive-analyzer generate-platform ./animation.riv --target json-schema
rive-analyzer generate-platform ./animation.riv --target zod
rive-analyzer generate-platform ./animation.riv --target dart
```

### contract-generate
```bash
rive-analyzer contract-generate ./animation.riv -o .rive-playground/contracts/animation.yaml
```

Contract example:
```yaml
version: 1.1.0
file: animation.riv
artboard: Main
stateMachine: Main SM
inputs:
  speed:
    type: number
    min: 0
    max: 10
    description: "Animation speed multiplier"
  isVisible:
    type: boolean
  RESET:
    type: trigger
```

### contract-validate
```bash
rive-analyzer contract-validate ./animation.riv ./animation.rive-contract.yaml
# Exits 1 if: input removed, type changed, artboard renamed
```

### compare
```bash
rive-analyzer compare ./animation-v1.riv ./animation-v2.riv
# Exits 1 on breaking changes — CI-safe
```

### list-assets
```bash
rive-analyzer list-assets ./animation.riv
```

### export-fields
```bash
rive-analyzer export-fields ./animation.riv --json
```

### init
```bash
rive-analyzer init
# Creates: .rive-playground/{presets,contracts,schedules,config.json}
```

### watch
```bash
rive-analyzer watch "./public/**/*.riv"
```

---

## MCP Server (11 tools)

```bash
node dist/mcp.js
```

Add to Claude Desktop:
```json
{
  "mcpServers": {
    "rive-analyzer": {
      "command": "node",
      "args": ["/absolute/path/to/rive-mcp-analyzer/dist/mcp.js"]
    }
  }
}
```

| Tool | Description |
|------|-------------|
| `inspect-rive` | Parse .riv — artboards, SMs, animations |
| `scan-rive-files` | Scan directory recursively |
| `validate-rive-config` | Check JS/TS config against .riv |
| `generate-rive-types` | TypeScript constants |
| `watch-rive-files` | Watch for changes |
| `export-rive-fields` | Deep extract ViewModels, DataEnums |
| `list-rive-assets` | Enumerate embedded/CDN assets |
| `generate-rive-contract` | Generate .rive-contract.yaml |
| `validate-rive-contract` | Validate .riv against contract |
| `generate-platform-types` | Swift/Kotlin/JSON Schema/Zod/Dart |
| `compare-rive-files` | Diff two files, detect breaking changes |

---

## Playground

```bash
cd playground
npm install
npm run dev
# Open http://localhost:5173
```

### Panels

| Panel | What it does |
|-------|-------------|
| Artboard | Select artboard and animation |
| State Machine | Live boolean/number/trigger controls |
| ViewModel | All property types with live editing |
| Text Runs | Edit text content, auto-discover from VMs |
| Events | Real-time Rive event log |
| Presets | Save / load / apply named configurations |
| Export | JSON + Markdown export |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `R` | Reset animation |
| `Ctrl/Cmd + S` | Save current state as preset |
| `Ctrl + Scroll` | Zoom canvas |
| `Alt + Drag` | Pan canvas |
| `Alt + Double-click` | Reset view |

### URL Deep-linking

```
http://localhost:5173?file=https://cdn.example.com/animation.riv&artboard=Main&sm=Main+SM
```

---

## Rive Contract System

The safety net between designers and developers. Define constraints on inputs — validate on every CI run.

```bash
# 1. Generate contract scaffold from .riv
rive-analyzer contract-generate hero.riv -o .rive-playground/contracts/hero.yaml

# 2. Edit: add min/max, required, descriptions
# 3. Validate in CI
rive-analyzer contract-validate hero.riv .rive-playground/contracts/hero.yaml
```

---

## Project Structure

```
src/
  cli.ts                      CLI (Commander + Clack, banner + NhoNH signature)
  mcp.ts                      MCP server (11 tools)
  parser/riveParser.ts        WASM headless parser
  tools/
    contract.ts               Contract system (YAML + Zod)
    compareFiles.ts           Breaking change detection
    generateMultiplatform.ts  Swift/Kotlin/JSON Schema/Zod/Dart codegen
    listAssets.ts             Asset enumeration
    exportFields.ts           ViewModel/DataEnum extraction
    [inspect, scan, validate, generateTypes, watch].ts
  ui/theme.ts                 CLI design system
  ui/banner.ts                ASCII art + NhoNH signature

playground/src/
  hooks/useRivePlayground.ts  Core state + event capture
  hooks/usePresets.ts         localStorage preset library
  components/panels/
    EventsPanel.tsx           Real-time event log
    PresetsPanel.tsx          Save/load configurations
  components/Toast.tsx        Error notifications
  types.ts                    RiveEvent, Preset, PlaygroundState

.rive-playground/             Git-trackable project config
  presets/                    Named configuration snapshots
  contracts/                  .rive-contract.yaml files
  schedules/                  (v1.2.0)
```

---

## Roadmap

| Version | Theme | Highlights |
|---------|-------|-----------|
| v1.1.0 | **Living Canvas** | Contract system, multi-platform codegen, preset library, events |
| v1.2.0 | **Living Server** | LiveConfig HTTP+WS, Config Scheduler, MCP-Playground bridge |
| v1.3.0 | **Intelligence** | AI Narrator, AI Config Assistant (opt-in), SM Visual Graph |

---

*Built by [NhoNH](https://github.com/hoainho) · rive-analyzer · github.com/hoainho*
