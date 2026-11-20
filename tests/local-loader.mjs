// Node's test runner loads the same TypeScript modules and JSON config as Next.
import { readFile } from "node:fs/promises";
import ts from "typescript";
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/"))
    specifier = new URL("../" + specifier.slice(2), import.meta.url).href;
  if (
    (specifier.startsWith(".") || specifier.startsWith("file:")) &&
    !/\.(mjs|ts|json)$/.test(specifier)
  )
    specifier += ".ts";
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.endsWith(".ts")) {
    const source = await readFile(new URL(url), "utf8");
    return {
      format: "module",
      shortCircuit: true,
      source: ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      }).outputText,
    };
  }
  if (url.endsWith("/client/settings.json"))
    return {
      format: "module",
      shortCircuit: true,
      source: "export default " + (await readFile(new URL(url), "utf8")),
    };
  return next(url, context);
}
