import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "application-ports", pattern: "src/application/ports/**" },
        { type: "app", pattern: "src/app/**" },
        { type: "features", pattern: "src/features/**" },
        { type: "application", pattern: "src/application/**" },
        { type: "learning", pattern: "src/learning/**" },
        { type: "content", pattern: "src/content/**" },
        { type: "renderers", pattern: "src/exercise-renderers/**" },
        { type: "infrastructure", pattern: "src/infrastructure/**" },
      ],
      "boundaries/files": [
        { pattern: "src/app/composition-root.tsx", category: "composition-root" },
      ],
    },
    rules: {
      ...boundaries.configs.recommended.rules,
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "composition-root" } },
              allow: { to: { element: { types: ["application", "application-ports", "features", "infrastructure", "learning"] } } },
            },
            {
              from: { file: { categories: "composition-root" } },
              allow: { to: { element: { types: ["application", "application-ports", "features", "infrastructure", "learning"] } } },
            },
            {
              from: { element: { type: "app" } },
              allow: { to: { element: { type: "features" } } },
            },
            {
              from: { element: { type: "features" } },
              allow: { to: { element: { types: ["application", "learning", "renderers"] } } },
            },
            {
              from: { element: { type: "application" } },
              allow: { to: { element: { types: ["application", "application-ports", "learning"] } } },
            },
            {
              from: { element: { type: "learning" } },
              allow: { to: { element: { types: ["learning", "content"] } } },
            },
            {
              from: { element: { type: "infrastructure" } },
              allow: { to: { element: { types: ["application-ports", "infrastructure", "learning"] } } },
            },
            {
              from: { element: { type: "renderers" } },
              allow: { to: { element: { type: "learning" } } },
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "node_modules/**", "coverage/**"]),
]);
