import type { Descendant } from "slate";
import type {
  TemplateNode,
  TokenRegistry,
  TokenType,
  TokenElement,
  CustomText,
  ParagraphElement,
} from "./types";

// Unique marker that won't appear in user input and won't match token delimiters
export const TEMP_NEWLINE_MARKER = "\u0000NEWLINE\u0000";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function serializeTemplate(
  nodes: TemplateNode[],
  registry: TokenRegistry
): string {
  let result = "";

  for (const node of nodes) {
    if (node.type === "text") {
      result += node.text;
    } else if (node.type === "token") {
      // Skip tokens with empty/unselected values
      if (!node.value) {
        continue;
      }
      const config = registry[node.tokenType];

      if (config) {
        const { open, close } = config.delimiters;
        const prefix = config.valuePrefix || "";
        const suffix = config.valueSuffix || "";
        // Apply prefix/suffix to the value when serializing
        const fullValue = `${prefix}${node.value}${suffix}`;
        result += `${open}${fullValue}${close}`;
      } else {
        result += node.value;
      }
    }
  }

  return result;
}

export function parseTemplate(
  input: string,
  tokenType: TokenType,
  registry: TokenRegistry
): TemplateNode[] {
  const config = registry[tokenType];
  if (!config) {
    return [{ type: "text", text: input }];
  }

  const { open, close } = config.delimiters;
  const prefix = config.valuePrefix || "";
  const suffix = config.valueSuffix || "";
  const nodes: TemplateNode[] = [];

  const pattern = new RegExp(
    escapeRegExp(open) +
      "([^" +
      escapeRegExp(close) +
      "]+)" +
      escapeRegExp(close),
    "g"
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    const [fullMatch, value] = match;
    const start = match.index;
    let trimmedValue = value.trim();

    if (start > lastIndex) {
      nodes.push({
        type: "text",
        text: input.slice(lastIndex, start),
      });
    }

    // Strip prefix/suffix from parsed token values
    if (prefix && trimmedValue.startsWith(prefix)) {
      trimmedValue = trimmedValue.substring(prefix.length);
    }
    if (suffix && trimmedValue.endsWith(suffix)) {
      trimmedValue = trimmedValue.substring(
        0,
        trimmedValue.length - suffix.length
      );
    }

    nodes.push({
      type: "token",
      tokenType,
      value: trimmedValue,
    });

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < input.length) {
    nodes.push({
      type: "text",
      text: input.slice(lastIndex),
    });
  }

  if (nodes.length === 0) {
    nodes.push({ type: "text", text: "" });
  }

  return nodes;
}

export function slateToTemplateNodes(
  value: Descendant[],
  newlineToken?: string
): TemplateNode[] {
  const result: TemplateNode[] = [];

  const visit = (node: Descendant) => {
    if ("text" in node && !("type" in node)) {
      const textNode = node as CustomText;
      if (textNode.text) {
        result.push({ type: "text", text: textNode.text });
      }
    } else if ("type" in node && node.type === "token") {
      const tokenNode = node as TokenElement;
      result.push({
        type: "token",
        tokenType: tokenNode.tokenType,
        value: tokenNode.value,
      });
    } else if ("children" in node) {
      const element = node as ParagraphElement;
      element.children.forEach(visit);
    }
  };

  value.forEach((node, index) => {
    visit(node);
    if (newlineToken && index < value.length - 1) {
      result.push({ type: "text", text: newlineToken });
    }
  });
  return result;
}

export function templateNodesToSlate(
  nodes: TemplateNode[],
  newlineToken?: string
): Descendant[] {
  if (newlineToken) {
    const paragraphs: Descendant[] = [];
    let currentChildren: Descendant[] = [];

    const pushParagraph = () => {
      if (currentChildren.length === 0) {
        currentChildren.push({ text: "" });
      }
      paragraphs.push({
        type: "paragraph",
        children: currentChildren,
      } as ParagraphElement);
      currentChildren = [];
    };

    for (const node of nodes) {
      if (node.type === "text") {
        const parts = node.text.split(newlineToken);
        parts.forEach((part, index) => {
          if (part) {
            currentChildren.push({ text: part } as CustomText);
          }
          if (index < parts.length - 1) {
            pushParagraph();
          }
        });
      } else {
        currentChildren.push({
          type: "token",
          tokenType: node.tokenType,
          value: node.value,
          children: [{ text: "" }],
        } as TokenElement);
      }
    }

    pushParagraph();
    return paragraphs.length > 0 ? paragraphs : createEmptySlateValue();
  }

  const children: Descendant[] = nodes.map((node) => {
    if (node.type === "text") {
      return { text: node.text } as CustomText;
    }
    return {
      type: "token",
      tokenType: node.tokenType,
      value: node.value,
      children: [{ text: "" }],
    } as TokenElement;
  });

  if (children.length === 0) {
    children.push({ text: "" });
  }

  return [
    {
      type: "paragraph",
      children,
    } as ParagraphElement,
  ];
}

export function stringToSlateValue(
  input: string,
  tokenType: TokenType,
  registry: TokenRegistry,
  newlineToken?: string
): Descendant[] {
  let processedInput = input;

  if (newlineToken) {
    const config = registry[tokenType];
    const fullNewlineToken = config
      ? `${config.delimiters.open}${newlineToken}${config.delimiters.close}`
      : newlineToken;

    // Normalize real newlines and replace fullNewlineToken with temp marker
    processedInput = input
      .replace(/\r\n/g, TEMP_NEWLINE_MARKER)
      .replace(/\n/g, TEMP_NEWLINE_MARKER)
      .replace(
        new RegExp(escapeRegExp(fullNewlineToken), "g"),
        TEMP_NEWLINE_MARKER
      );
  }

  const templateNodes = parseTemplate(processedInput, tokenType, registry);
  return templateNodesToSlate(
    templateNodes,
    newlineToken ? TEMP_NEWLINE_MARKER : undefined
  );
}

export function slateValueToString(
  value: Descendant[],
  registry: TokenRegistry,
  newlineToken?: string,
  tokenType?: TokenType
): string {
  const templateNodes = slateToTemplateNodes(
    value,
    newlineToken ? TEMP_NEWLINE_MARKER : undefined
  );

  let result = serializeTemplate(templateNodes, registry);

  // Replace temp marker back with actual newlineToken (with delimiters)
  if (newlineToken && tokenType) {
    const config = registry[tokenType];
    const fullNewlineToken = config
      ? `${config.delimiters.open}${newlineToken}${config.delimiters.close}`
      : newlineToken;

    result = result.replace(
      new RegExp(escapeRegExp(TEMP_NEWLINE_MARKER), "g"),
      fullNewlineToken
    );
  }

  return result;
}

export function createEmptySlateValue(): Descendant[] {
  return [
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
  ];
}

/**
 * Extract all token values from a string.
 * Returns an array of plain token values (the BE values, not labels).
 * Excludes the newlineToken if provided.
 * Strips valuePrefix/valueSuffix from registry config if present.
 *
 * Example:
 * Input: "Hello {{data_field.selected.appointment_provider}} at {{data_field.selected.appointment_date_time}}"
 * With valuePrefix: "data_field.selected."
 * Output: ["appointment_provider", "appointment_date_time"]
 */
export function extractTokenValues(
  input: string,
  tokenType: TokenType,
  registry: TokenRegistry,
  newlineToken?: string
): string[] {
  const nodes = parseTemplate(input, tokenType, registry);
  const config = registry[tokenType];
  const prefix = config?.valuePrefix || "";
  const suffix = config?.valueSuffix || "";

  return nodes
    .filter(
      (node): node is { type: "token"; tokenType: TokenType; value: string } =>
        node.type === "token" && !!node.value && node.value !== newlineToken
    )
    .map((node) => {
      let value = node.value;
      // Strip prefix if present
      if (prefix && value.startsWith(prefix)) {
        value = value.substring(prefix.length);
      }
      // Strip suffix if present
      if (suffix && value.endsWith(suffix)) {
        value = value.substring(0, value.length - suffix.length);
      }
      return value;
    });
}
