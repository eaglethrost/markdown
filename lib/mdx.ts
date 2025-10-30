import type { Root as HastRoot } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import type { PluggableList } from 'unified';
import type { VFile } from 'vfile';

import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import compilers from '../processor/compile';
import { compatabilityTransfomer, commentBlocks, divTransformer, readmeToMdx, tablesToJsx } from '../processor/transform';
import { escapePipesInTables } from '../processor/transform/escape-pipes-in-tables';

interface Opts {
  file?: VFile | string;
  hast?: boolean;
  remarkTransformers?: PluggableList;
  rdmd?: { mdast: (doc: string) => MdastRoot } | undefined;
}

export const mdx = (
  tree: HastRoot | MdastRoot,
  { hast = false, remarkTransformers = [], file, rdmd, ...stringifyOpts }: Opts = {},
) => {
  const processor = unified();

  if (rdmd) processor.data('rdmd', rdmd);

  processor
    .use(hast ? rehypeRemark : undefined)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkTransformers)
    .use(commentBlocks)
    .use(divTransformer)
    .use(readmeToMdx)
    .use(tablesToJsx)
    .use(compatabilityTransfomer)
    .use(escapePipesInTables)
    .use(compilers)
    .use(remarkStringify, stringifyOpts);

  // @ts-expect-error - @todo: coerce the processor and tree to the correct
  // type depending on the value of hast
  return processor.stringify(processor.runSync(tree, file));
};

export default mdx;
