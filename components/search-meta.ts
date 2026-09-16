import type { HitKind } from "../lib/search";

export function kindIcon(kind: HitKind): string {
  switch (kind) {
    case "Page":
      return "⌂";
    case "Symbol":
      return "∿";
    case "Instrument":
      return "⌗";
    case "Strategy":
      return "◎";
    case "Engine":
      return "⚙";
    case "Venue":
      return "⇄";
    case "Model":
      return "∴";
    case "Broker":
      return "▤";
  }
}
