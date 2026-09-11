export function capitalizeWords(text: string): string {
  return text.replace(/(^|[\s-])(\p{L})/gu, (_match, prefix, letter) =>
    prefix + letter.toLocaleUpperCase("es-AR"),
  );
}
