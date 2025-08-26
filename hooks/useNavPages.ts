import { useEffect, useState } from "react";

type NavPage = {
  id: string;
  slug: string;
  title: string;
  navOrder: number;
  navDropdown: string | null;
};

export function useNavPages() {
  const [pages, setPages] = useState<NavPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNavPages() {
      try {
        const res = await fetch("/api/custom-pages");
        if (res.ok) {
          const data = await res.json();
          // Filter for navigation pages and sort by navOrder
          const navPages = data.pages
            .filter((page: any) => page.showInNav)
            .sort((a: any, b: any) => a.navOrder - b.navOrder);
          setPages(navPages);
        }
      } catch (error) {
        console.error("Failed to load navigation pages:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNavPages();
  }, []);

  return { pages, loading };
}