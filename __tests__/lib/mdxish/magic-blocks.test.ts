import type { Element } from 'hast';

import { mdxishWrapper } from '../../helpers';

describe('magic blocks', () => {
  describe('image block', () => {
    it('should restore image block', () => {
      const md = `[block:image]
{
"images": [
  {
    "image": [
      "https://files.readme.io/327e65d-image.png",
      null,
      null
    ],
    "align": "left",
    "sizing": "50%"
  }
]
}
[/block]`;

      const ast = mdxishWrapper(md);
      expect(ast.children[0].type).toBe('element');

      const element = ast.children[0] as Element;
      expect(element.tagName).toBe('img');
      expect(element.properties.src).toBe('https://files.readme.io/327e65d-image.png');
      expect(element.properties.alt).toBe('');
      expect(element.properties.align).toBe('left');
      expect(element.properties.width).toBe('50%');
    });
  });

  describe('table block', () => {
    it('should restore parameters block to tables', () => {
      const md = `[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Term',
      'h-1': 'Definition',
      '0-0': 'Events',
      '0-1': 'Pseudo-list:  \n● One  \n● Two',
    },
    cols: 2,
    rows: 1,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]`;

      const ast = mdxishWrapper(md);
      console.log(JSON.stringify(ast, null, 2));

      // Some extra children are added to the AST by the mdxish wrapper
      expect(ast.children).toHaveLength(4);
      expect(ast.children[2].type).toBe('element');

      const element = ast.children[2] as Element;
      expect(element.tagName).toBe('table');
      expect(element.children).toHaveLength(2);
      expect((element.children[0] as Element).tagName).toBe('thead');
      expect((element.children[1] as Element).tagName).toBe('tbody');
    });
  })
});