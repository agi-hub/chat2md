import prettier from 'prettier/standalone';
import parserBabel from 'prettier/plugins/babel';
import parserEstree from 'prettier/plugins/estree';
import parserHtml from 'prettier/plugins/html';
import parserCss from 'prettier/plugins/postcss';
import parserMarkdown from 'prettier/plugins/markdown';
import parserYaml from 'prettier/plugins/yaml';

// 语言到 prettier parser 的映射
const PARSER_MAP = {
  javascript: { parser: 'babel', plugins: [parserBabel, parserEstree] },
  js: { parser: 'babel', plugins: [parserBabel, parserEstree] },
  jsx: { parser: 'babel', plugins: [parserBabel, parserEstree] },
  typescript: { parser: 'babel', plugins: [parserBabel, parserEstree] },
  ts: { parser: 'babel', plugins: [parserBabel, parserEstree] },
  tsx: { parser: 'babel', plugins: [parserBabel, parserEstree] },
  json: { parser: 'json', plugins: [parserBabel, parserEstree] },
  html: { parser: 'html', plugins: [parserHtml] },
  css: { parser: 'css', plugins: [parserCss] },
  scss: { parser: 'css', plugins: [parserCss] },
  less: { parser: 'css', plugins: [parserCss] },
  markdown: { parser: 'markdown', plugins: [parserMarkdown] },
  md: { parser: 'markdown', plugins: [parserMarkdown] },
  yaml: { parser: 'yaml', plugins: [parserYaml] },
  yml: { parser: 'yaml', plugins: [parserYaml] },
};

// 格式化单个代码块
export async function formatCode(code, lang) {
  const config = PARSER_MAP[lang?.toLowerCase()];
  if (!config) return code; // 不支持的语言原样返回

  try {
    const formatted = await prettier.format(code, {
      parser: config.parser,
      plugins: config.plugins,
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
      printWidth: 80,
    });
    return formatted.trim();
  } catch (e) {
    console.warn(`格式化 ${lang} 代码失败:`, e.message);
    return code; // 格式化失败原样返回
  }
}

// 格式化 Markdown 中所有代码块
export async function formatMarkdownCodeBlocks(markdown) {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const matches = [...markdown.matchAll(codeBlockRegex)];

  if (matches.length === 0) return markdown;

  let result = markdown;
  for (const match of matches) {
    const lang = match[1];
    const code = match[2];
    const formatted = await formatCode(code, lang);
    if (formatted !== code) {
      result = result.replace(match[0], `\`\`\`${lang}\n${formatted}\n\`\`\``);
    }
  }

  return result;
}
