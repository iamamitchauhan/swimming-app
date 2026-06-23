import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Transforms } from "slate";
import { useSlateStatic, ReactEditor } from "slate-react";
import {
  useFloating,
  offset as floatOffset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react-dom";

import useOutsideClick from "@/hooks/useOutsideClick";
import type { TokenElement, TokenOption, TokenRegistry } from "./types";
import { classes } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface TokenDropdownProps {
  element: TokenElement;
  registry: TokenRegistry;
}

const TokenDropdown: React.FC<TokenDropdownProps> = ({ element, registry }) => {
  const editor = useSlateStatic();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const config = registry[element.tokenType];
  const options = config?.options || [];

  const selectedOption = options.find((o) => o.value === element.value);
  const displayLabel = selectedOption?.label ?? element.value;

  const { x, y, refs, strategy } = useFloating({
    placement: "bottom-start",
    middleware: [floatOffset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const buttonRefForOutsideClick = {
    current: refs.reference.current as HTMLButtonElement | null,
  };

  useOutsideClick(dropdownRef, () => setIsOpen(false), buttonRefForOutsideClick);

  const handleSelect = (option: TokenOption) => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(editor, { value: option.value }, { at: path });
    setIsOpen(false);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <button
        ref={refs.setReference}
        onClick={handleToggle}
        className={classes(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm cursor-pointer h-5",
          "bg-primary-450 hover:bg-primary-450/90",
          "focus:outline-none",
        )}
        type="button"
      >
        <span className="truncate">{displayLabel || "Select One"}</span>
        <ChevronDown className="w-4 h-4 transition-transform duration-200" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={(node) => {
              refs.setFloating(node);
              dropdownRef.current = node;
            }}
            className="fixed z-50 rounded bg-white shadow-dropdown max-h-60 overflow-auto scrollbar-thin border border-default"
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
              minWidth: 150,
            }}
          >
            <ul className="rounded select-none divide-y divide-gray">
              {options.length > 0 ? (
                <>
                  {options.map((opt) => (
                    <li
                      key={opt.value}
                      onClick={() => handleSelect(opt)}
                      className={classes(
                        "relative cursor-pointer hover:bg-gray px-4 py-2 text-xs transition-all duration-200",
                        selectedOption?.value === opt.value &&
                          "font-semibold selected-menu text-primary-700 bg-gray-50 hover:bg-transparent",
                      )}
                    >
                      {opt.label}
                    </li>
                  ))}
                </>
              ) : (
                <li className="px-4 py-2 text-sm text-gray-500">No options</li>
              )}
            </ul>
          </div>,
          document.getElementById("checkpoint-builder-v3") ?? document.body,
        )}
    </>
  );
};

export default TokenDropdown;
