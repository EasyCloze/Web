const keys = ['', 'meta', 'highlight', 'root', 'children', 'type', 'text'];

function reverseRecord(input: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [value, key]));
}

const replacementMap: Record<string, string> = { '"meta"\:': '"m"\:', '"highlight"\:': '"h"\:', '"root"\:': '"r"\:', '"children"\:': '"c"\:', '"text"\:': '"x"\:', '"type"\:"root"': '"t"\:"r"', '"type"\:"paragraph"': '"t"\:"p"', '"type"\:"text"': '"t"\:"x"', '"type"\:"hidden"': '"t"\:"h"' };
const reverseReplacementMap: Record<string, string> = reverseRecord(replacementMap);

function replaceWithMap(str: string, map: Record<string, string>) {
  return str.replace(new RegExp(Object.keys(map).join('|'), 'g'), matched => map[matched]);
}

export const emptyContent = '{"r":{"c":[{"c":[],"t":"p"}],"t":"r"}}';

export function stringifyContent(content: object) {
  return replaceWithMap(JSON.stringify(content, (key, value) => keys.includes(key) || !isNaN(Number(key)) ? value : undefined), replacementMap);
}

export function parseContent(str: string) {
  return replaceWithMap(str, reverseReplacementMap);
}

export const listOfHiddenLimit = 7;

export function getListOfHidden(str: string): string[] {
  return [...str.matchAll(/"x":"(.*?)"/g)].filter(m => /"t":"h"/.test(str.slice(m.index, str.indexOf('}', m.index)))).map(m => m[1]);
}
