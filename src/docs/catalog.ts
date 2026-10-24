export interface Schema {
  type?: string | string[];
  description?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
  enum?: (string | number)[];
  const?: string | number | boolean;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  multipleOf?: number;
  pattern?: string;
  format?: string;
}
export interface DocTool {
  name: string;
  title: string;
  description: string;
  category: string;
  inputSchema: Schema;
  outputSchema: Schema;
  variants: Schema[];
  examples: { label: string; arguments: unknown }[];
}
export interface DocsCatalog {
  version: string;
  tools: DocTool[];
}
