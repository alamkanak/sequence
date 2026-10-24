import { tools, toolCatalog, jsonSchema, serverVersion } from "./contracts.ts";
import type { core } from "zod/v4";

/** Fail the build on incomplete reference text or invalid published examples. */
export function docsCatalog() {
  const catalog = toolCatalog();
  for (const tool of Object.values(tools)) {
    for (const example of tool.examples) tool.input.parse(example.arguments);
  }
  function check(schema: core.JSONSchema.JSONSchema, path: string) {
    if (
      !schema.type &&
      !schema.anyOf &&
      !schema.oneOf &&
      !schema.allOf &&
      !schema.$ref &&
      schema.const === undefined &&
      !schema.enum
    )
      throw new Error(`Untyped MCP schema: ${path}`);
    if (
      schema.type === "object" &&
      !schema.anyOf &&
      !schema.oneOf &&
      schema.additionalProperties !== false
    )
      throw new Error(`MCP objects must reject unknown fields: ${path}`);
    for (const [name, child] of Object.entries(schema.properties ?? {})) {
      if (typeof child === "boolean" || !child.description?.trim())
        throw new Error(`Missing MCP parameter description: ${path}.${name}`);
      check(child, `${path}.${name}`);
    }
    if (
      schema.items &&
      typeof schema.items === "object" &&
      !Array.isArray(schema.items)
    )
      check(schema.items, `${path}[]`);
    for (const key of ["anyOf", "oneOf", "allOf"] as const)
      schema[key]?.forEach((child, index) => {
        if (typeof child !== "boolean")
          check(child, `${path}.${key}[${index}]`);
      });
  }
  for (const tool of catalog) {
    check(tool.inputSchema, `${tool.name}.input`);
    check(tool.outputSchema, `${tool.name}.output`);
  }
  return {
    version: serverVersion,
    tools: catalog.map((definition) => {
      const source = tools[definition.name as keyof typeof tools];
      return {
        ...definition,
        category: source.category,
        examples: source.examples,
        variants: (source.variants ?? []).map((schema) => jsonSchema(schema)),
      };
    }),
  };
}
