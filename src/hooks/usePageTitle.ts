import { useEffect } from "react";

const SUFFIX = "Ótica Dominante";

export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | ${SUFFIX}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
