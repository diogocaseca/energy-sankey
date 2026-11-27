import { css, html, nothing, TemplateResult } from "lit";
import { mdiFlag } from "@mdi/js";
import { HomeAssistant } from "../ha/types";
import { setupCustomlocalize } from "../localize";

type TariffFlagKind = "green" | "yellow" | "red1" | "red2" | "unknown";

/**
 * Maps the state of a "tariff flag" (bandeira tarifária) entity to a colour
 * kind. Matching is deliberately lenient (accent/case/punctuation
 * insensitive, Portuguese or English) since each integration names the states
 * differently, e.g. "Verde", "amarela", "vermelha_patamar_2", "red 1".
 */
export function classifyTariffFlag(state: string): TariffFlagKind {
  const s = state
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
  if (/verde|green/.test(s)) {
    return "green";
  }
  if (/amarel|yellow/.test(s)) {
    return "yellow";
  }
  if (/vermelh|red/.test(s)) {
    return /(^|\D)2(\D|$)|\bii\b/.test(s) ? "red2" : "red1";
  }
  return "unknown";
}

export function renderTariffFlag(
  hass: HomeAssistant,
  entityId?: string
): TemplateResult | typeof nothing {
  if (!entityId) {
    return nothing;
  }
  const label = setupCustomlocalize(hass)("card.generic.tariff_flag");
  const stateObj = hass.states[entityId];
  const kind = stateObj ? classifyTariffFlag(stateObj.state) : "unknown";
  const text = stateObj ? hass.formatEntityState(stateObj) : entityId;
  return html`<div class="tariff-flag-row">
    <span class="tariff-flag ${kind}" title=${label}>
      <ha-svg-icon .path=${mdiFlag}></ha-svg-icon>${text}
    </span>
  </div>`;
}

export const tariffFlagStyles = css`
  .tariff-flag-row {
    display: flex;
    padding: 0 16px 8px;
  }
  .tariff-flag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color);
    --tariff-flag-color: var(--secondary-text-color);
  }
  .tariff-flag ha-svg-icon {
    --mdc-icon-size: 24px;
    --icon-primary-color: var(--tariff-flag-color);
  }
  .tariff-flag.green {
    --tariff-flag-color: #0f9d58;
  }
  .tariff-flag.yellow {
    --tariff-flag-color: #f9a825;
  }
  .tariff-flag.red1 {
    --tariff-flag-color: #e53935;
  }
  .tariff-flag.red2 {
    --tariff-flag-color: #b71c1c;
  }
`;
