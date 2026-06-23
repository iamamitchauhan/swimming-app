import { createContext, useContext } from "react";
import type { TokenType, TokenRegistry } from "./types";

export type TokenInsertContextType = {
  insertToken: (value: string) => void;
  tokenType: TokenType;
  registry: TokenRegistry;
} | null;

export const TokenInsertContext = createContext<TokenInsertContextType>(null);

export const useTokenInsert = () => {
  const context = useContext(TokenInsertContext);
  if (!context) {
    throw new Error("useTokenInsert must be used within TokenizedTextEditor");
  }
  return context;
};
