import { LovelaceCardConfig } from "./ha/data/lovelace/config/card";

interface ElecFlowCardConfig extends LovelaceCardConfig {
  title?: string;
  hide_small_consumers?: boolean;
  battery_charge_only_from_generation?: boolean;
  // Raw MDI SVG path data (e.g. from `@mdi/js`) for the "Unknown source"
  // phantom node shown when tracked stats don't fully reconcile.
  unknown_source_icon?: string;
  // Fill color override for the "Unknown source" phantom node, e.g. "#0f9d58".
  unknown_source_color?: string;
}

export interface EnergyElecFlowCardConfig extends ElecFlowCardConfig {
  collection_key?: string; // @todo this might not be needed.
}

export interface PowerFlowCardConfig extends ElecFlowCardConfig {
  power_from_grid_entity?: string;
  power_to_grid_entity?: string;
  generation_entity?: string;
  independent_grid_in_out?: boolean;
  consumer_entities: {
    entity: string;
    name?: string;
  }[];
}
