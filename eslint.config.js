import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";

export default defineConfig(
    {
        ignores: ["dist/**", "node_modules/**"],
    },
    js.configs.recommended,
    ts.configs.recommended,
    svelte.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
    {
        files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
        languageOptions: {
            parserOptions: {
                extraFileExtensions: [".svelte"],
                parser: ts.parser,
            },
        },
    },
);
