import { useEffect, useState } from "react";
import { useHiringStore } from "./store";

export function useHydratedStore() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    useHiringStore.persist.rehydrate();
    setReady(true);
  }, []);
  return ready;
}
