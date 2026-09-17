/** Remove linhas de bullet sem conteúdo real (ex.: "- " sozinho), que a IA
 *  às vezes gera e acabam aparecendo como um "–" solto no editor/preview/PDF. */
export function stripEmptyBullets(markdown: string): string {
  return markdown
    .split('\n')
    .filter((line) => !/^\s*-\s*$/.test(line))
    .join('\n');
}
