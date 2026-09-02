import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import Preloader from "@/components/Preloader";
import debounce from "lodash.debounce";
import Workspace from "@/models/workspace";

const DEFAULT_SEARCH_RESULTS = {
  workspaces: [],
  threads: [],
};

const SEARCH_RESULT_SELECTED = "search-result-selected";
export default function SearchBox() {
  const { t } = useTranslation();
  const searchRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(DEFAULT_SEARCH_RESULTS);
  const handleSearch = debounce(handleSearchDebounced, 500);

  async function handleSearchDebounced(e) {
    try {
      const searchValue = e.target.value;
      setSearchTerm(searchValue);
      setLoading(true);
      const searchResults =
        await Workspace.searchWorkspaceOrThread(searchValue);
      setSearchResults(searchResults);
    } catch (error) {
      console.error(error);
      setSearchResults(DEFAULT_SEARCH_RESULTS);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    searchRef.current.value = "";
    setSearchTerm("");
    setLoading(false);
    setSearchResults(DEFAULT_SEARCH_RESULTS);
  }

  useEffect(() => {
    window.addEventListener(SEARCH_RESULT_SELECTED, handleReset);
    return () =>
      window.removeEventListener(SEARCH_RESULT_SELECTED, handleReset);
  }, []);

  return (
    <div className="relative flex h-[38px] w-full items-center">
      <div className="relative h-full w-full flex">
        <input
          ref={searchRef}
          type="search"
          placeholder={t("common.search")}
          onChange={handleSearch}
          onReset={handleReset}
          onFocus={(e) => e.target.select()}
          className="border-none w-full h-full rounded-lg bg-theme-sidebar-item-default pl-10 focus:pl-4 pr-2 placeholder:text-white/50 light:placeholder:text-slate-500 placeholder:font-semibold outline-none text-theme-text-primary search-input peer text-[15px]"
        />
        <Search
          size={16}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-settings-input-placeholder peer-focus:invisible"
          hidden={!!searchTerm}
        />
      </div>
      <SearchResults
        searchResults={searchResults}
        searchTerm={searchTerm}
        loading={loading}
      />
    </div>
  );
}

function SearchResultWrapper({ children }) {
  return (
    // Anchored to the search row (which is `relative`) rather than to the
    // sidebar: `SidebarContainer` is `fixed inset-y-0`, so a percentage offset
    // here resolves against the viewport height and lands on the input itself.
    <div className="thin-scrollbar absolute inset-x-0 top-full z-30 mt-2 flex max-h-[min(50vh,420px)] flex-col gap-y-[24px] overflow-y-auto rounded-lg bg-popover p-[16px] text-popover-foreground shadow-md ring-1 ring-foreground/10">
      {children}
    </div>
  );
}

function SearchResults({ searchResults, searchTerm, loading }) {
  if (!searchTerm || searchTerm.length < 3) return null;
  if (loading)
    return (
      <SearchResultWrapper>
        <div className="flex flex-col gap-y-[8px] h-[200px] justify-center items-center">
          <Preloader size={5} />
          <p className="text-theme-text-secondary text-xs font-semibold text-center">
            Searching for "{searchTerm}"
          </p>
        </div>
      </SearchResultWrapper>
    );

  if (
    searchResults.workspaces.length === 0 &&
    searchResults.threads.length === 0
  ) {
    return (
      <SearchResultWrapper>
        <div className="flex flex-col gap-y-[8px] h-[200px] justify-center items-center">
          <p className="text-theme-text-secondary text-xs font-semibold text-center">
            No results found for
            <br />
            <span className="text-theme-text-primary font-semibold text-sm">
              "{searchTerm}"
            </span>
          </p>
        </div>
      </SearchResultWrapper>
    );
  }

  return (
    <SearchResultWrapper>
      <SearchResultCategory
        name="Workspaces"
        items={searchResults.workspaces?.map((workspace) => ({
          id: workspace.slug,
          to: paths.workspace.chat(workspace.slug),
          name: workspace.name,
        }))}
      />
      <SearchResultCategory
        name="Threads"
        items={searchResults.threads?.map((thread) => ({
          id: thread.slug,
          to: paths.workspace.thread(thread.workspace.slug, thread.slug),
          name: thread.name,
          hint: thread.workspace.name,
        }))}
      />
    </SearchResultWrapper>
  );
}

function SearchResultCategory({ items, name }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-col gap-y-[8px]">
      <p className="text-theme-text-secondary text-xs uppercase font-semibold px-[4px]">
        {name}
      </p>
      <div className="flex flex-col gap-y-[6px]">
        {items.map((item) => (
          <SearchResultItem
            key={item.id}
            to={item.to}
            name={item.name}
            hint={item.hint}
          />
        ))}
      </div>
    </div>
  );
}

function SearchResultItem({ to, name, hint }) {
  return (
    <Link
      to={to}
      onClick={() => window.dispatchEvent(new Event(SEARCH_RESULT_SELECTED))}
      className="hover:bg-white/10 light:hover:bg-black/10 transition-all duration-300 rounded-sm px-[8px] py-[2px]"
    >
      <p className="text-theme-text-primary text-[15px] truncate w-[80%]">
        {name}
        {hint && (
          <span className="text-theme-text-secondary text-xs ml-[4px]">
            | {hint}
          </span>
        )}
      </p>
    </Link>
  );
}
