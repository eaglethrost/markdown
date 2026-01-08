import type { Root, RootContent } from 'mdast';
import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx-expression';
import type { Plugin } from 'unified';

import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { evaluateExpression, type JSXContext } from './preprocess-jsx-expressions';

/**
 * Creates a markdown parser for parsing markdown content in expressions.
 */
const createMarkdownParser = () =>
  unified()
    .data('micromarkExtensions', [mdxExpression({ allowEmpty: true })])
    .data('fromMarkdownExtensions', [mdxExpressionFromMarkdown()])
    .use(remarkParse)
    .use(remarkGfm);

/**
 * Checks if an expression looks like markdown content (starts with markdown symbols).
 */
function looksLikeMarkdown(expression: string): boolean {
  const trimmed = expression.trim();
  // Check for common markdown symbols at the start
  return /^[`*_#\-+>[<]/.test(trimmed);
}

/**
 * Parses markdown content and returns MDAST nodes.
 * For inline contexts, unwraps paragraphs to get inline nodes.
 */
function parseAsMarkdown(content: string, inline: boolean): RootContent[] {
  if (!content.trim()) {
    return inline ? [{ type: 'text', value: '' }] : [];
  }
  const parser = createMarkdownParser();
  const tree = parser.runSync(parser.parse(content)) as Root;

  if (inline) {
    // Unwrap paragraphs for inline content
    return tree.children.flatMap(n =>
      n.type === 'paragraph' && 'children' in n ? (n.children as RootContent[]) : [n as RootContent],
    );
  }
  return tree.children as RootContent[];
}

/**
 * AST transformer to evaluate MDX expressions using the provided context.
 * Replaces mdxFlowExpression and mdxTextExpression nodes with their evaluated values.
 * If an expression looks like markdown, it parses it as markdown instead of evaluating.
 */
const evaluateExpressions: Plugin<[{ context?: JSXContext }], Root> =
  ({ context = {} } = {}) =>
  tree => {
    visit(tree, ['mdxFlowExpression', 'mdxTextExpression'], (node, index, parent) => {
      if (!parent || index === null || index === undefined) return;

      const expressionNode = node as MdxFlowExpression | MdxTextExpression;
      if (!('value' in expressionNode)) return;

      const expression = expressionNode.value.trim();
      // Skip if expression is empty (shouldn't happen, but defensive)
      if (!expression) return;

      // If expression looks like markdown, parse it as markdown instead of evaluating
      if (looksLikeMarkdown(expression)) {
        const isInline = expressionNode.type === 'mdxTextExpression';
        const parsedNodes = parseAsMarkdown(expression, isInline);
        if (parsedNodes.length > 0) {
          parent.children.splice(index, 1, ...parsedNodes);
          return;
        }
      }

      try {
        const result = evaluateExpression(expression, context);

        // Extract evaluated value text
        let textValue: string;
        if (result === null || result === undefined) {
          textValue = '';
        } else if (typeof result === 'object') {
          textValue = JSON.stringify(result);
        } else {
          textValue = String(result).replace(/\s+/g, ' ').trim();
        }

        // Replace expression node with text node since the expression is conceptually a text
        parent.children.splice(index, 1, {
          type: 'text',
          value: textValue,
          position: node.position,
        });
      } catch (_error) {
        // If evaluation fails, leave the expression as-is (fallback to text)
        parent.children.splice(index, 1, {
          type: 'text',
          value: `{${expression}}`,
          position: node.position,
        });
      }
    });

    return tree;
  };

export default evaluateExpressions;
