"use client";

import { useCallback, useEffect, useState } from "react";
import { clockOffset, getHold, type HoldDetail } from "../application/holds";

export type HoldState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; hold: HoldDetail; offset: number };

// Loads one option of the signed-in student; `offset` aligns countdowns on the server clock.
export function useHold(id: string) {
  const [state, setState] = useState<HoldState>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      const hold = await getHold(id);
      if (hold === "anonymous") setState({ status: "anonymous" });
      else if (!hold) setState({ status: "missing" });
      else setState({ status: "ready", hold, offset: clockOffset(hold.now) });
    } catch {
      setState({ status: "error" });
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { state, refresh };
}
