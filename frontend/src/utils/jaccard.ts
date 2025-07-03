export function jaccardIndex(a: string, b: string): number {
  const tokenize = (str: string) =>
    str
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean)
  const aTokens = new Set(tokenize(a))
  const bTokens = new Set(tokenize(b))
  const intersection = Array.from(aTokens).filter((t) => bTokens.has(t)).length
  const union = new Set([...aTokens, ...bTokens]).size
  return union === 0 ? 0 : intersection / union
}