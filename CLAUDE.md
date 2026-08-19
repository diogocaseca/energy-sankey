# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Energy Sankey is a Home Assistant Lovelace custom card set (distributed via HACS) that renders animated sankey diagrams of electrical power/energy flow (grid, generation, batteries, consumers). Built with LitElement/TypeScript, bundled with Rollup into a single `dist/energy-sankey.js`.

## Commands

There is no `package.json` checked in — it's generated from `package.json.template` by `scripts/update_package_json_version.sh` (injects the version from `git describe --tags`), which runs automatically as a Rollup build step. Run `npm install` after that script has produced a `package.json` at least once (CI does this via `scripts/update_package_json_version.sh` before `npm ci`).

```bash
scripts/update_package_json_version.sh   # generates package.json from the template (run first if package.json is missing)
npm install
npm run build       # one-off rollup build -> dist/energy-sankey.js
npm run start        # rollup --watch, for local development
npm run format        # prettier --write .
```

There is no lint script and no test suite in this repo — CI (`.github/workflows/build.yml`) only runs the build, and `.github/workflows/validate.yml` runs HACS repository validation on `main`. Releases (`.github/workflows/release.yml`) build and attach `dist/*.js` to GitHub releases triggered by `v*.*.*` tags — versioning is entirely git-tag driven, don't hand-edit a version field.

To manually verify a change, load `dist/energy-sankey.js` as a Lovelace resource in a real (or dev) Home Assistant instance, since there's no automated test coverage of rendering.

## Architecture

**Entry point**: [src/energy-sankey.ts](src/energy-sankey.ts) just imports/registers the two cards and the underlying `ha-elec-sankey` element as side effects; it's the Rollup `input`.

**Rendering core — [src/elec-sankey.ts](src/elec-sankey.ts) (~2300 lines)**: `ElecSankey`, a framework-agnostic (no Home Assistant coupling) `LitElement` that draws the sankey diagram as SVG. It takes plain `ElecRoute`/`ElecRoutePair` data (grid in/out, generation, per-consumer, per-battery rates) as properties and computes the whole geometry itself — widths are scaled proportionally to rate, colors are blended between grid/generation/battery sources using `mixHexes`/`mix3Hexes`. Layout is done in two phases: fixed-aspect-ratio elements on the left (grid/generation/battery inputs) and variable-aspect-ratio fan-out on the right (to consumers) — see the comment block at the top of the file for the geometry rationale and the `render*Flow` method family for each flow segment (generation→consumers, grid→battery, blend segments, etc). `_generateLabelDiv` is left as an overridable hook (returns `nothing` by default) so subclasses can render HA-aware labels (icons, more-info clicks, localized units).

**HA-aware wrapper — [src/ha-elec-sankey.ts](src/ha-elec-sankey.ts)**: `HaElecSankey extends ElecSankey`, adds the `hass` property, implements `_generateLabelDiv` with HA formatting/localization/more-info dialog support, and applies HA-themed CSS. This is the element the two cards actually place in their DOM.

**Cards** ([src/cards/energy-card](src/cards/energy-card), [src/cards/power-card](src/cards/power-card)): each card is a Lovelace custom card (`LovelaceCard`) plus a paired config editor (`*-editor.ts`), both extending `ElecFlowCardBase` ([src/shared/elec-flow-card-base.ts](src/shared/elec-flow-card-base.ts)), which mixes in `SubscribeMixin` for hass subscriptions and sets up localization. Each card:
- owns an `EnergyElecFlowCardConfig`/`PowerFlowCardConfig` ([src/types.ts](src/types.ts))
- has a `verifyAndMigrateConfig` function that upgrades older saved configs in place via a `config_version` counter — bump this and add a migration step when changing config shape, don't just add fields
- registers itself via `registerCustomCard` ([src/utils/custom-cards.ts](src/utils/custom-cards.ts)) so it shows up in the HA card picker
- converts HA entity states into `ElecRoute`/`ElecRoutePair` objects and feeds them to a `<ha-elec-sankey>` in its render output

The **energy card** subscribes to HA's energy statistics collection (`getEnergyDataCollection`, day/period totals in kWh) — no manual entity config needed, it reads the user's existing Energy dashboard setup. The **power card** reads live power entities directly (`power_from_grid_entity`, `generation_entity`, `consumer_entities`, etc, in W/kW) and lets the user pick entities, with auto-detection as a fallback in the editor.

**`src/ha/`**: a vendored/trimmed subset of Home Assistant frontend source (`common/`, `data/`, `components/`, `mixins/`, `panels/`, `types.ts`) copied in so the card can use HA's own formatting, entity, theming, and lovelace-config helpers without depending on the full `home-assistant-frontend` package. Treat these as third-party — when HA's upstream versions of these files change, prefer re-syncing them over hand-modifying behavior, and keep changes minimal/compatible with the original API surface.

**Localization** ([src/localize.ts](src/localize.ts), [src/translations/*.json](src/translations)): a hand-rolled `key.path.lookup` translator over static JSON imports, falling back to English then to the raw key. New languages must be un-commented in `languages` in `localize.ts` after adding the JSON file — see the README's translation contribution section for the full process. Card-facing keys are namespaced `card.generic.*` (added automatically for the low-level `ElecSankey`/`ha-elec-sankey` labels which don't know their card context).

## Build details worth knowing

- Rollup output is a single ES module bundle (`inlineDynamicImports: true`) — no code splitting.
- `@rollup/plugin-alias` remaps several `lit/*` deep imports to explicit `.js` paths; if you add a new `lit/directives/...` import that fails to resolve at build time, check whether it needs an alias entry in [rollup.config.mjs](rollup.config.mjs).
- `package.json`'s `overrides`/`resolutions` pin specific versions of `@lit/reactive-element`, `lit`, `lit-html`, etc. to match what Home Assistant's frontend expects — don't bump these independently without checking HA frontend compatibility.
