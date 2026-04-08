#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const _pkg = _require("../package.json") as { version: string };

import { inspectRive, formatInspectOutput } from "./tools/inspect.js";
import { scanDirectory, formatScanOutput } from "./tools/scan.js";
import { validateConfig, formatValidateOutput } from "./tools/validate.js";
import { generateTypes } from "./tools/generateTypes.js";
import { watchRiveFiles, formatDiff } from "./tools/watch.js";
import { exportFields, formatFieldsOutput } from "./tools/exportFields.js";
import { listAssets, formatAssetsOutput } from "./tools/listAssets.js";
import { generateContract, validateContract, formatContractValidation, formatContractYaml } from "./tools/contract.js";
import { generateMultiplatform } from "./tools/generateMultiplatform.js";
import { compareRiveFiles, formatCompareOutput } from "./tools/compareFiles.js";

const server = new McpServer({
  name: "rive-analyzer",
  version: _pkg.version,
});

server.tool(
  "inspect-rive",
  {
    filePath: z.string().describe("Absolute or relative path to a .riv file"),
    format: z
      .enum(["json", "text"])
      .optional()
      .default("text")
      .describe("Output format"),
  },
  async ({ filePath, format }) => {
    const meta = await inspectRive(filePath);
    const text =
      format === "json"
        ? JSON.stringify(meta, null, 2)
        : formatInspectOutput(meta);
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "scan-rive-files",
  {
    directory: z
      .string()
      .describe("Directory path to scan recursively for .riv files"),
    format: z
      .enum(["json", "text"])
      .optional()
      .default("text")
      .describe("Output format"),
  },
  async ({ directory, format }) => {
    const result = await scanDirectory(directory);
    const text =
      format === "json"
        ? JSON.stringify(result, null, 2)
        : formatScanOutput(result);
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "validate-rive-config",
  {
    rivFile: z.string().describe("Path to .riv file"),
    configFile: z
      .string()
      .describe("Path to JS/TS config file containing Rive artboard/SM names"),
    format: z
      .enum(["json", "text"])
      .optional()
      .default("text")
      .describe("Output format"),
  },
  async ({ rivFile, configFile, format }) => {
    const result = await validateConfig(rivFile, configFile);
    const text =
      format === "json"
        ? JSON.stringify(result, null, 2)
        : formatValidateOutput(result);
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "generate-rive-types",
  {
    rivFile: z.string().describe("Path to .riv file"),
    outputFile: z
      .string()
      .optional()
      .describe("Output .ts file path (prints to response if omitted)"),
  },
  async ({ rivFile, outputFile }) => {
    const output = await generateTypes(rivFile, outputFile);
    const message = outputFile
      ? `Types written to: ${outputFile}\n\n${output}`
      : output;
    return { content: [{ type: "text", text: message }] };
  },
);

server.tool(
  "watch-rive-files",
  {
    pattern: z
      .string()
      .describe(
        "Glob pattern for .riv files to watch (e.g. ./public/**/*.riv)",
      ),
    durationSeconds: z
      .number()
      .optional()
      .default(30)
      .describe("How long to watch in seconds before returning"),
  },
  async ({ pattern, durationSeconds }) => {
    const diffs: string[] = [];

    const stopWatch = watchRiveFiles(
      pattern,
      (diff) => {
        diffs.push(formatDiff(diff));
      },
      (err, path) => {
        diffs.push(`Error watching ${path}: ${err.message}`);
      },
    );

    await new Promise((resolve) =>
      setTimeout(resolve, (durationSeconds ?? 30) * 1000),
    );
    await stopWatch();

    const text =
      diffs.length > 0
        ? diffs.join("\n---\n")
        : `Watched "${pattern}" for ${durationSeconds}s — no changes detected.`;

    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "export-rive-fields",
  {
    filePath: z.string().describe("Path to .riv file"),
    format: z
      .enum(["json", "text"])
      .optional()
      .default("text")
      .describe("Output format"),
  },
  async ({ filePath, format }) => {
    const result = await exportFields(filePath);
    const text =
      format === "json"
        ? JSON.stringify(result, null, 2)
        : formatFieldsOutput(result);
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "list-rive-assets",
  {
    filePath: z.string().describe("Path to .riv file"),
    format: z.enum(["json", "text"]).optional().default("text").describe("Output format"),
  },
  async ({ filePath, format }) => {
    const result = await listAssets(filePath);
    const text = format === "json" ? JSON.stringify(result, null, 2) : formatAssetsOutput(result);
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "generate-rive-contract",
  {
    rivFile: z.string().describe("Path to .riv file"),
    outputFile: z.string().optional().describe("Output .yaml file path (prints if omitted)"),
  },
  async ({ rivFile, outputFile }) => {
    const out = await generateContract(rivFile, outputFile);
    return { content: [{ type: "text", text: out }] };
  },
);

server.tool(
  "validate-rive-contract",
  {
    rivFile: z.string().describe("Path to .riv file"),
    contractFile: z.string().describe("Path to .rive-contract.yaml file"),
    format: z.enum(["json", "text"]).optional().default("text"),
  },
  async ({ rivFile, contractFile, format }) => {
    const result = await validateContract(rivFile, contractFile);
    const text = format === "json" ? JSON.stringify(result, null, 2) : formatContractValidation(result);
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "generate-platform-types",
  {
    rivFile: z.string().describe("Path to .riv file"),
    target: z.enum(["swift", "kotlin", "json-schema", "zod", "dart"]).describe("Target platform"),
    outputFile: z.string().optional().describe("Output file path (prints if omitted)"),
  },
  async ({ rivFile, target, outputFile }) => {
    const out = await generateMultiplatform(rivFile, target, outputFile);
    return { content: [{ type: "text", text: out }] };
  },
);

server.tool(
  "compare-rive-files",
  {
    fileA: z.string().describe("Path to first .riv file (baseline)"),
    fileB: z.string().describe("Path to second .riv file (updated)"),
    format: z.enum(["json", "text"]).optional().default("text"),
  },
  async ({ fileA, fileB, format }) => {
    const result = await compareRiveFiles(fileA, fileB);
    const text = format === "json" ? JSON.stringify(result, null, 2) : formatCompareOutput(result);
    return { content: [{ type: "text", text }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
