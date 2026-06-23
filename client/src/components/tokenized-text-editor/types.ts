import type { BaseEditor, Descendant } from "slate";
import type { ReactEditor } from "slate-react";

export type TokenOption = {
  label: string;
  value: string;
};

export type TokenType = string;

export type TokenDelimiters = {
  open: string;
  close: string;
};

export type TokenConfig = {
  delimiters: TokenDelimiters;
  options: TokenOption[];
  valuePrefix?: string;
  valueSuffix?: string;
};

export type TokenRegistry = Record<TokenType, TokenConfig>;

export type CustomText = {
  text: string;
};

export type ParagraphElement = {
  type: "paragraph";
  children: Descendant[];
};

export type TokenElement = {
  type: "token";
  tokenType: TokenType;
  value: string;
  children: [{ text: "" }];
};

export type CustomElement = ParagraphElement | TokenElement;

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

export type TemplateTextNode = {
  type: "text";
  text: string;
};

export type TemplateTokenNode = {
  type: "token";
  tokenType: TokenType;
  value: string;
};

export type TemplateNode = TemplateTextNode | TemplateTokenNode;

export interface TokenizedTextEditorRef {
  insertToken: (initialValue?: string) => void;
}
