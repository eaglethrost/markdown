import type { Html, Parent, Root } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

const COMMENT_REGEX = /^<!--([\s\S]*?)-->$/;

const commentBlocks: Plugin<[], Root> = function commentBlocksPlugin() {
  const rdmd = this.data('rdmd');

  return tree => {
    if (!rdmd?.mdast) return;

    visit(tree, 'html', (node: Html, index: number, parent: Parent) => {
      if (!parent || typeof index !== 'number' || typeof node.value !== 'string') return;

      const match = node.value.match(COMMENT_REGEX);
      if (!match) return;

      let parsed;
      try {
        parsed = rdmd.mdast(match[1]);
      } catch (err) {
        return;
      }
      const children = parsed?.children?.filter(child => {
        if (child.type !== 'paragraph' || child.children.length !== 1) return true;

        const text = child.children[0];
        return text.type !== 'text' || text.value.trim() !== '';
      });

      if (!children?.length) return;

      parent.children.splice(index + 1, 0, ...children);
    });
  };
};

export default commentBlocks;
