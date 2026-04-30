/** @type {import('lint-staged').Config} */
export default {
  '*.{ts,tsx,js,jsx,json,css,md}': ['biome check --write --no-errors-on-unmatched'],
};
