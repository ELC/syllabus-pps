export const SHELL_FONT_MARKUP = `    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&family=Open+Sans:wght@400;600&display=swap"
      rel="stylesheet"
    />`;

/** @returns {import('vite').Plugin} */
export function shellFontLinksPlugin() {
  return {
    name: "pps-shell-font-links",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (html.includes("fonts.googleapis.com")) {
          return html;
        }
        return html.replace("<head>", `<head>\n${SHELL_FONT_MARKUP}`);
      },
    },
  };
}
