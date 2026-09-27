import {
  BarbellIcon,
  BookBookmarkIcon,
  BookOpenTextIcon,
  BooksIcon,
  BrainIcon,
  CalendarBlankIcon,
  type Icon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  MusicNotesIcon,
  PencilSimpleLineIcon,
  ScrollIcon,
  SparkleIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import type { ToolDictionary } from "@/i18n/en_tools";

/**
 * How a tool shows up in the chat. Keyed by the same names as the dictionary's
 * tool strings, so a tool given words and no icon, or the other way round,
 * fails the build.
 */

type ToolName = Exclude<keyof ToolDictionary, "other">;

const ICONS: Record<ToolName, Icon> = {
  read_profile: UserCircleIcon,
  read_today: CalendarBlankIcon,
  write_entry: PencilSimpleLineIcon,
  find_entries: MagnifyingGlassIcon,
  read_entry: BookOpenTextIcon,
  recall_entry: MagnifyingGlassIcon,
  open_entry: BookOpenTextIcon,
  search_books: BooksIcon,
  search_gutenberg: ScrollIcon,
  search_scripture: BookBookmarkIcon,
  search_bronze_age_pervert: BarbellIcon,
  search_lyrics: MusicNotesIcon,
  load_skill: LightbulbIcon,
  remember: BrainIcon,
  forget: BrainIcon,
  search_memory: BrainIcon,
};

function isKnown(name: string): name is ToolName {
  return Object.hasOwn(ICONS, name);
}

export interface ToolDisplay {
  icon: Icon;
  running: string;
  done: string;
  failed: string;
}

export function toolDisplay(name: string, tools: ToolDictionary): ToolDisplay {
  if (!isKnown(name)) {
    return { icon: SparkleIcon, ...tools.other };
  }

  return { icon: ICONS[name], ...tools[name] };
}
