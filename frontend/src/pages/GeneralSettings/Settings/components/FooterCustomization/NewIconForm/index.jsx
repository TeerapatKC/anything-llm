import { ICON_COMPONENTS } from "@/components/Footer";
import React, { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NewIconForm({ icon, url, onSave, onRemove }) {
  const [selectedIcon, setSelectedIcon] = useState(icon || "Plus");
  const [selectedUrl, setSelectedUrl] = useState(url || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setSelectedIcon(icon || "Plus");
    setSelectedUrl(url || "");
    setIsEdited(false);
  }, [icon, url]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedIcon !== "Plus" && selectedUrl) {
      onSave(selectedIcon, selectedUrl);
      setIsEdited(false);
    }
  };

  const handleRemove = () => {
    onRemove();
    setSelectedIcon("Plus");
    setSelectedUrl("");
    setIsEdited(false);
  };

  const handleIconChange = (iconName) => {
    setSelectedIcon(iconName);
    setIsDropdownOpen(false);
    setIsEdited(true);
  };

  const handleUrlChange = (e) => {
    setSelectedUrl(e.target.value);
    setIsEdited(true);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-x-2">
      <div className="relative" ref={dropdownRef}>
        <div
          className="h-8 w-8 bg-theme-bg-secondary border border-theme-sidebar-border rounded-full flex items-center justify-center cursor-pointer hover:border-theme-text-secondary transition-colors"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {React.createElement(ICON_COMPONENTS[selectedIcon] || Plus, {
            className: "h-4 w-4",
            color: "var(--theme-sidebar-footer-icon-fill)",
          })}
        </div>
        {isDropdownOpen && (
          <div className="absolute z-10 mt-2 grid max-h-[100px] w-[160px] grid-cols-4 gap-1 overflow-y-auto rounded-lg bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            {Object.keys(ICON_COMPONENTS).map((iconName) => (
              <button
                key={iconName}
                type="button"
                className="flex justify-center items-center rounded-md p-1.5 hover:bg-theme-bg-secondary transition-colors"
                onClick={() => handleIconChange(iconName)}
              >
                {React.createElement(ICON_COMPONENTS[iconName], {
                  className: "h-4 w-4",
                  color: "var(--theme-sidebar-footer-icon-fill)",
                })}
              </button>
            ))}
          </div>
        )}
      </div>
      <Input
        type="url"
        value={selectedUrl}
        onChange={handleUrlChange}
        placeholder="https://example.com"
        className="w-[320px]"
        required
      />
      {selectedIcon !== "Plus" && (
        <>
          {isEdited ? (
            <Button
              type="submit"
              size="sm"
              variant="default"
              className="h-8 px-3"
            >
              Save
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-theme-text-secondary hover:text-destructive"
              onClick={handleRemove}
              aria-label="Remove icon"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </form>
  );
}
