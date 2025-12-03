import type { InlineCode, Node, Parents, Root } from 'mdast';

import { visit } from 'unist-util-visit';

import { type BlockHit } from '../../lib/utils/extractMagicBlocks';

import magicBlocksLegacy from './magic-blocks-legacy';

interface Processor {
  parse: (content: string) => Root;
  runSync: (tree: Root, content: string) => Root;
  use: (plugin: unknown) => Processor;
}

interface RdmdProcessor {
  processor: () => Processor;
  setup: (doc: string) => [string];
}

interface MagicBlockRestorerOptions {
  blocks: BlockHit[];
  rdmd?: RdmdProcessor;
}

// Reuse legacy markdown parser to parse the magic blocks and return the mdast tree
const magicBlockRestorer = ({ blocks, rdmd }: MagicBlockRestorerOptions) => (tree: Node) => {
  if (!rdmd || !blocks.length) return;

  const tokenLookup = new Map(
    blocks.map(({ token, raw }) => {
      const normalizedToken = token.replace(/^`|`$/g, '');
      return [normalizedToken, raw];
    })
  );

  visit(tree, 'inlineCode', (node: InlineCode, index, parent: Parents) => {
    if (!parent || index == null) return;
    const raw = tokenLookup.get(node.value);
    if (!raw) return;

    const [normalized] = rdmd.setup(raw);
    const processor = rdmd.processor().use(magicBlocksLegacy);
    const legacyTree = processor.parse(normalized);
    processor.runSync(legacyTree, normalized);

    // If parsing failed to produce children, leave the token in place
    if (!legacyTree?.children?.length) return;

    parent.children.splice(index, 1, ...legacyTree.children);
  });
};

export default magicBlockRestorer;

