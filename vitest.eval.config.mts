import { defineConfig } from "vitest/config";
import base from "./vitest.config.mts";

// Evals (`npm run eval:judge`): separate from the unit tests, so a pass mark not yet met doesn't block every commit.
export default defineConfig({ ...base, test: { ...base.test, include: ["tests/eval/**/*.eval.test.ts"], silent: false } });
