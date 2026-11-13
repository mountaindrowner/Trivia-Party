// ESLint for the whole repo: `npm run lint`. The recommended rules (real bugs: undefined names, unreachable code,
// duplicate keys, and so on), set up for each kind of code in the repo.
import js from "@eslint/js";
import globals from "globals";

const rules = {
  "no-unused-vars": ["error", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
  "no-empty": ["error", { allowEmptyCatch: true }],
};

export default [
  { ignores: ["**/node_modules/**", "dist/**", "huddle/server/static/**", "huddle/server/.wrangler/**", "js/vendor/**", "itch/**"] },
  js.configs.recommended,
  // Trivia Holy Party: plain browser scripts sharing the THP namespace (index.html loads them in order).
  {
    files: ["js/**/*.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.browser, THP: "writable", qrcode: "readonly" } },
    rules,
  },
  // Spark Wars on the TV: browser scripts sharing SW (core.js) and the data files.
  {
    files: ["spark/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: { ...globals.browser, SW: "writable", SPARK_DATA: "writable", SPARK_LINES: "writable", SPARK_VOICE: "writable", THP: "writable", qrcode: "readonly" },
    },
    rules,
  },
  // Bonfire Ice Breaker on the TV: browser scripts sharing BONFIRE (the questions) and BF (core.js).
  {
    files: ["bonfire/**/*.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.browser, BONFIRE: "writable", BF: "writable", BONFIRE_MUSIC: "writable", LIGHTS_OUT: "writable", SD_VIEW: "writable", SIGNAL_DIVIDE: "writable", LIGHTS_OUT_RULES: "writable", LO_CARD: "writable", THP: "writable", qrcode: "readonly" } },
    rules,
  },
  // The phone page.
  { files: ["huddle/phone/**/*.js"], languageOptions: { sourceType: "script", globals: globals.browser }, rules },
  // The room server: a Cloudflare Worker (ES modules).
  {
    files: ["huddle/server/src/**/*.js"],
    languageOptions: { sourceType: "module", globals: { ...globals.serviceworker, WebSocketPair: "readonly", WebSocketRequestResponsePair: "readonly" } },
    rules,
  },
  // End-to-end tests (Node + Playwright; the callbacks they pass to page.evaluate run in the browser).
  {
    files: ["tests/**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node, ...globals.browser, SPARK: "readonly", BONFIRE_TV: "readonly", BONFIRE: "readonly", LIGHTS_OUT: "readonly", SIGNAL_DIVIDE: "readonly", THP: "writable", SPARK_DATA: "writable", SPARK_VOICE: "writable" } },
    rules,
  },
  // Node: tests, tools, this file.
  { files: ["**/*.mjs", "tools/**/*.js", "eslint.config.js", "stylelint.config.js"], languageOptions: { sourceType: "module", globals: globals.node }, rules },
];
