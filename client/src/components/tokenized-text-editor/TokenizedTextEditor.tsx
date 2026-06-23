import React, {
  useCallback,
  useMemo,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createEditor, Transforms, Editor } from "slate";
import type { Descendant } from "slate";
import { Slate, Editable, withReact, ReactEditor } from "slate-react";
import type { RenderElementProps } from "slate-react";

import TokenDropdown from "./TokenDropdown";
import {
  stringToSlateValue,
  slateValueToString,
  createEmptySlateValue,
  parseTemplate,
  templateNodesToSlate,
  TEMP_NEWLINE_MARKER,
} from "./utils";
import type { TokenRegistry, TokenType, TokenElement, CustomElement } from "./types";

export interface TokenizedTextEditorRef {
  insertToken: (initialValue?: string) => void;
}

interface TokenizedTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  tokenType: TokenType;
  registry: TokenRegistry;
  placeholder?: string;
  label?: string;
  description?: string;
  variant?: "primary" | "secondary";
  wrapperClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
  onFocus?: () => void;
  newlineToken?: string;
  containerClassName?: string;
  editorClassName?: string;
}

const withTokens = (editor: Editor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element) => (element as CustomElement).type === "token" || isInline(element);

  editor.isVoid = (element) => (element as CustomElement).type === "token" || isVoid(element);

  return editor;
};

const TokenizedTextEditor = forwardRef<TokenizedTextEditorRef, TokenizedTextEditorProps>(
  (
    {
      value,
      onChange,
      tokenType,
      registry,
      placeholder = "Enter text...",
      label,
      description,
      variant = "primary",
      wrapperClassName,
      labelClassName,
      disabled = false,
      onFocus,
      newlineToken,
      containerClassName,
      editorClassName,
    },
    ref,
  ) => {
    const editor = useMemo(() => withTokens(withReact(createEditor())), []);

    const [editorValue, setEditorValue] = useState<Descendant[]>(
      value
        ? stringToSlateValue(value, tokenType, registry, newlineToken)
        : createEmptySlateValue(),
    );

    /**
     * Sync external string value → slate value
     */
    useEffect(() => {
      const currentString = slateValueToString(editorValue, registry, newlineToken, tokenType);
      if (value === currentString) return;

      const nextValue = value
        ? stringToSlateValue(value, tokenType, registry, newlineToken)
        : createEmptySlateValue();

      Editor.withoutNormalizing(editor, () => {
        editor.children = nextValue;
        Transforms.select(editor, Editor.end(editor, []));
      });

      editor.onChange();

      setEditorValue(nextValue);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, tokenType, registry, newlineToken]);

    const handleChange = useCallback(
      (newValue: Descendant[]) => {
        setEditorValue(newValue);
        const newString = slateValueToString(newValue, registry, newlineToken, tokenType);
        if (newString !== value) {
          onChange(newString);
        }
      },
      [onChange, value, registry, newlineToken, tokenType],
    );

    const insertToken = useCallback(
      (initialValue?: string) => {
        if (!editor.selection) {
          Transforms.select(editor, Editor.end(editor, []));
        }

        const token: TokenElement = {
          type: "token",
          tokenType,
          value: initialValue ?? "",
          children: [{ text: "" }],
        };

        // Insert space before, then token, then space after
        Transforms.insertText(editor, " ");
        Transforms.insertNodes(editor, token);
        Transforms.move(editor);
        Transforms.insertText(editor, " ");
        ReactEditor.focus(editor);
      },
      [editor, tokenType],
    );

    useImperativeHandle(ref, () => ({
      insertToken,
    }));

    const renderElement = useCallback(
      ({ attributes, children, element }: RenderElementProps) => {
        if (element.type === "token") {
          return (
            <span {...attributes} contentEditable={false} data-slate-node="element">
              <TokenDropdown element={element as TokenElement} registry={registry} />
              {children}
            </span>
          );
        }

        return <p {...attributes}>{children}</p>;
      },
      [registry],
    );

    const handlePaste = useCallback(
      (event: React.ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        if (!text) return;

        let processedText = text;

        if (newlineToken) {
          const config = registry[tokenType];
          const fullNewlineToken = config
            ? `${config.delimiters.open}${newlineToken}${config.delimiters.close}`
            : newlineToken;

          // Replace real newlines and fullNewlineToken with temp marker
          processedText = text
            .replace(/\r\n/g, TEMP_NEWLINE_MARKER)
            .replace(/\n/g, TEMP_NEWLINE_MARKER)
            .replace(
              new RegExp(fullNewlineToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
              TEMP_NEWLINE_MARKER,
            );
        }

        const templateNodes = parseTemplate(processedText, tokenType, registry);
        const slateNodes = templateNodesToSlate(
          templateNodes,
          newlineToken ? TEMP_NEWLINE_MARKER : undefined,
        );

        Transforms.insertFragment(editor, slateNodes);
      },
      [editor, tokenType, registry, newlineToken],
    );

    return (
      <div className={"flex flex-col gap-1"}>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                className={"self-start font-semibold select-none text-sm"}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="self-start select-none text-[13px]">{description}</span>
            )}
          </div>
        )}

        
          <Slate editor={editor} initialValue={editorValue} onChange={handleChange}>
            <Editable
              className={editorClassName}
              placeholder={placeholder}
              readOnly={disabled}
              renderElement={renderElement}
              onPaste={handlePaste}
              onFocus={!disabled ? onFocus : undefined}
            />
          </Slate>
      </div>
    );
  },
);

export default TokenizedTextEditor;
