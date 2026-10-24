"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import SaveBar from "./save_bar";
import SettingsFields from "./settings_fields";
import { saveProfileAction } from "../actions";
import { openFacts } from "../facts";
import { useAgentKey } from "@/features/chat/use_agent_key";
import { draftFromProfile } from "../draft";
import { SettingsActionType, useSettings } from "../settings_state";
import type { SaveOutcome } from "../service";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface SettingsBodyOptions {
  t: Dictionary;
  locale: Locale;
  subject: string;
  /** The profile's facts, still sealed. */
  facts: string;
}

/** Opens the sealed facts into the form once the key is in this browser. */
function useOpenedFacts(sealed: string, key: string | null) {
  const { dispatch } = useSettings();

  useEffect(() => {
    if (!key) {
      return;
    }

    let live = true;

    void openFacts(sealed, key).then((facts) => {
      if (live) {
        dispatch(
          facts
            ? { type: SettingsActionType.FactsOpened, data: facts.birthday }
            : { type: SettingsActionType.FactsSealed },
        );
      }
    });

    return () => {
      live = false;
    };
  }, [sealed, key, dispatch]);
}

export default function SettingsBody(options: SettingsBodyOptions) {
  const { state, dispatch } = useSettings();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const key = useAgentKey(options.subject);

  useOpenedFacts(options.facts, key);

  function apply(outcome: SaveOutcome) {
    if (outcome.status === "invalid") {
      dispatch({ type: SettingsActionType.Rejected, data: outcome.issues });
      return;
    }

    if (outcome.status === "failed") {
      dispatch({ type: SettingsActionType.Failed });
      return;
    }

    dispatch({
      type: SettingsActionType.Stored,
      data: draftFromProfile(outcome.profile, state.draft.birthday),
    });

    // A language change moves the whole app, so the page it lands on is the
    // same settings page under the new locale rather than a refresh in the old.
    if (outcome.profile.config.language !== options.locale) {
      router.push(`/${outcome.profile.config.language}/settings`);
      return;
    }

    router.refresh();
  }

  // The action can reject before it has an outcome to report — reading the
  // profile, writing the first one, setting a cookie. That is still a failure
  // the form has to show rather than a promise nobody is watching.
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: SettingsActionType.Submit });
    startTransition(async () => {
      // The facts go only when they changed, because they go with the key.
      const changed = state.facts === "open" && state.draft.birthday !== state.stored.birthday;
      const outcome = await saveProfileAction(state.draft, changed && key ? key : undefined).catch(
        () => null,
      );

      if (!outcome) {
        dispatch({ type: SettingsActionType.Failed });
        return;
      }

      apply(outcome);
    });
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      {/* Frozen while the save is in flight: an edit made now would be thrown
          away by the snapshot coming back. */}
      <fieldset className="contents" disabled={pending}>
        <SettingsFields t={options.t} />
      </fieldset>
      <SaveBar pending={pending} t={options.t} />
    </form>
  );
}
