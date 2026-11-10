import type React from "react";
import type { TemplateId } from "@wjnp/contracts";
import type { SceneProps } from "../common";
import { Bullets } from "./Bullets";
import { Clip } from "./Clip";
import { Comparison } from "./Comparison";
import { EndCard } from "./EndCard";
import { PersonalTake } from "./PersonalTake";
import { QuoteCard } from "./QuoteCard";
import { Statement } from "./Statement";
import { Stat } from "./Stat";
import { Timeline } from "./Timeline";
import { TitleHook } from "./TitleHook";

export const TEMPLATES: Record<TemplateId, React.FC<SceneProps>> = {
  title_hook: TitleHook,
  statement: Statement,
  stat: Stat,
  comparison: Comparison,
  bullets: Bullets,
  timeline: Timeline,
  quote_card: QuoteCard,
  clip: Clip,
  personal_take: PersonalTake,
  end_card: EndCard,
};
