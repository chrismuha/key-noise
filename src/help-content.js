import { version } from '../package.json';
import changeList from '../CHANGE_LIST.md?raw';

export const appVersion = version;
// The existing changelog records feature groups, not historical version numbers.
// Show its complete notes without dates; never invent past version identifiers.
export const releases = changeList.split(/^## /m).slice(1).map(section => {
  const [heading, ...lines] = section.split('\n');
  const title = heading.replace(/^.*?\s[—–]\s/, '').trim();
  const items = [];
  for (const line of lines) {
    if (/^-\s/.test(line)) items.push(line.replace(/^-\s+/, '').trim());
    else if (/^\s+\S/.test(line) && items.length) items[items.length - 1] += ` ${line.trim()}`;
  }
  return { title, items };
});
