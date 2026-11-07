// Stylelint for the whole repo: `npm run lint`. The recommended rules catch invalid CSS (unknown properties, bad
// values, duplicate selectors that override each other by accident) without enforcing a house style.
export default {
  extends: ["stylelint-config-recommended"],
  ignoreFiles: ["**/node_modules/**", "dist/**", "huddle/server/static/**", "itch/**"],
  rules: {
    // Later rules deliberately override earlier ones in the skins and looks; keep this one off.
    "no-descending-specificity": null,
  },
};
