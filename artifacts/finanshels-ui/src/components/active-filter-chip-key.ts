export function makeActiveFilterChipKey(filterKey: string, value: string) {
  return `${filterKey}::${encodeURIComponent(value)}`;
}

export function parseActiveFilterChipKey(key: string) {
  const separator = key.indexOf('::');
  if (separator === -1) return { filterKey: key, value: null };

  return {
    filterKey: key.slice(0, separator),
    value: decodeURIComponent(key.slice(separator + 2)),
  };
}