import type { Parent, Root, RootContent } from "mdast";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";

export type ChatEntityKind = "map" | "player";

const ENTITY_NAMES = ["map", "player"] as const;
const MAX_ENTITIES_PER_MESSAGE = 20;
const ID_PATTERN = /^\d{1,20}$/;
const INCOMPLETE_DIRECTIVE_PATTERN = /(?<![\w:])::?(?:[A-Za-z][\w-]*)?(?:\[[^\]\n]*\]?)?(?:\{[^}\n]*)?$/;
const DIRECTIVE_NAME_PATTERN = /^::?([A-Za-z][\w-]*)?/;

function isEntityKind(name: string | null | undefined): name is ChatEntityKind {
  return name === "map" || name === "player";
}

/**
 * Reads a directive id, quoted or unquoted, and returns it only when it is a plain number.
 */
export function parseEntityId(raw: string | null | undefined) {
  const trimmed = raw?.trim().replace(/^["']|["']$/g, "");
  return trimmed !== undefined && ID_PATTERN.test(trimmed) ? trimmed : undefined;
}

/**
 * Removes a directive that is still being typed at the very end of a streaming message, so a partial
 * `::map{id=12` or a lone `:` never shows as raw text. Complete directives and unknown names are kept.
 */
export function stripIncompleteDirective(text: string) {
  const match = INCOMPLETE_DIRECTIVE_PATTERN.exec(text);
  if (match === null) {
    return text;
  }
  const name = DIRECTIVE_NAME_PATTERN.exec(match[0])?.[1] ?? "";
  const isPossibleName = name === "" || ENTITY_NAMES.some(entityName => entityName.startsWith(name));
  if (!isPossibleName) {
    return text;
  }
  return text.slice(0, match.index);
}

type DirectiveNode = Parent & {
  type: "textDirective" | "leafDirective" | "containerDirective";
  name: string;
  attributes?: Record<string, string | null | undefined> | null;
};

type EntityNode = Parent & {
  type: "chatEntity";
  data: { hName: string; hProperties: Record<string, string> };
};

type EntityListNode = Parent & {
  type: "chatEntityList";
  data: { hName: string };
};

declare module "mdast" {
  interface RootContentMap {
    chatEntity: EntityNode;
    chatEntityList: EntityListNode;
  }
  interface BlockContentMap {
    chatEntity: EntityNode;
    chatEntityList: EntityListNode;
  }
  interface PhrasingContentMap {
    chatEntity: EntityNode;
  }
}

function isDirective(node: { type: string }): node is DirectiveNode {
  return node.type === "textDirective" || node.type === "leafDirective" || node.type === "containerDirective";
}

function isEntity(node: { type: string }): node is EntityNode {
  return node.type === "chatEntity";
}

function toEntity(node: DirectiveNode, kind: ChatEntityKind, id: string) {
  const isInline = node.type === "textDirective";
  const entity: EntityNode = {
    type: "chatEntity",
    data: {
      hName: "chat-entity",
      hProperties: { dataKind: kind, dataId: id, dataInline: isInline ? "true" : "false" },
    },
    children: isInline ? node.children : [],
  };
  return entity;
}

function toRawText(node: DirectiveNode, source: string) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  const raw = start !== undefined && end !== undefined ? source.slice(start, end) : "";
  const text: RootContent = { type: "text", value: raw };
  if (node.type === "textDirective") {
    return text;
  }
  const paragraph: RootContent = { type: "paragraph", children: [text] };
  return paragraph;
}

function groupEntities(parent: Parent) {
  const grouped: Parent["children"] = [];
  let run: EntityNode[] = [];
  const flush = () => {
    if (run.length > 0) {
      const list: EntityListNode = {
        type: "chatEntityList",
        data: { hName: "chat-entity-list" },
        children: run,
      };
      grouped.push(list);
      run = [];
    }
  };
  for (const child of parent.children) {
    if (isEntity(child) && child.data.hProperties.dataInline === "false") {
      run.push(child);
    } else {
      flush();
      grouped.push(child);
    }
  }
  flush();
  parent.children = grouped;
  for (const child of grouped) {
    if ("children" in child && child.type !== "chatEntityList") {
      groupEntities(child);
    }
  }
}

/**
 * Remark plugin (use after `remark-directive`) that turns ScoreSaber directives into custom elements.
 *
 * Grammar:
 * - `::map{id=12345}` / `::player{id=76561198000000000}` on their own line render a map or player row.
 *   Consecutive lines render as one stack.
 * - `:map[Label]{id=12345}` / `:player[Label]{id=7656...}` inline render a compact link chip.
 * - Ids may be quoted or unquoted and must be digits.
 *
 * Every other directive (unknown names, `10:30`, `:foo`, bad ids) is turned back into the exact text typed.
 */
export const remarkChatDirectives: Plugin<[], Root> = () => (tree, file) => {
  const source = String(file.value);
  let entityCount = 0;
  visit(tree, (node, index, parent) => {
    if (!isDirective(node) || parent === undefined || index === undefined) {
      return;
    }
    const id = parseEntityId(node.attributes?.id);
    const isSupportedShape = node.type === "textDirective" || node.type === "leafDirective";
    const kind = isEntityKind(node.name) ? node.name : undefined;
    let replacement: RootContent = toRawText(node, source);
    if (kind !== undefined && id !== undefined && isSupportedShape) {
      if (entityCount >= MAX_ENTITIES_PER_MESSAGE) {
        if (node.type === "textDirective") {
          parent.children.splice(index, 1, ...node.children);
          return [SKIP, index + node.children.length];
        }
      } else {
        entityCount++;
        replacement = toEntity(node, kind, id);
      }
    }
    parent.children[index] = replacement;
    return [SKIP, index + 1];
  });
  groupEntities(tree);
};
