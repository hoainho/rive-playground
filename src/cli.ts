#!/usr/bin/env node
import { program } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { createRequire } from "module";
const _cliRequire = createRequire(import.meta.url);
const _cliPkg = _cliRequire("../package.json") as { version: string };
import { printBanner, printMiniHeader, printFooter, printError } from "./ui/banner.js";
import { colors } from "./ui/theme.js";
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
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";

function isCancel(v: unknown): v is symbol {
  return typeof v === "symbol";
}

async function resolveFile(argFile: string | undefined, prompt: string): Promise<string> {
  if (argFile) return argFile;
  const answer = await p.text({
    message: prompt,
    placeholder: "./animation.riv",
    validate: (v) => ((v ?? "").trim() ? undefined : "Path is required"),
  });
  if (isCancel(answer)) {
    p.cancel(colors.muted("Cancelled."));
    process.exit(0);
  }
  return answer as string;
}

async function resolveDir(argDir: string | undefined): Promise<string> {
  if (argDir) return argDir;
  const answer = await p.text({
    message: "Directory to scan?",
    placeholder: "./public",
    validate: (v) => ((v ?? "").trim() ? undefined : "Directory is required"),
  });
  if (isCancel(answer)) {
    p.cancel(colors.muted("Cancelled."));
    process.exit(0);
  }
  return answer as string;
}

program
  .name("rive-analyzer")
  .description("Rive Animation File Analyzer & Platform")
  .version(_cliPkg.version);

program
  .command("inspect [rivFile]")
  .description("Parse a .riv file — list artboards, state machines, animations")
  .option("--json", "Output raw JSON")
  .action(async (rivFile: string | undefined, opts: { json?: boolean }) => {
    printMiniHeader("inspect");
    const spinner = p.spinner();
    try {
      const file = await resolveFile(rivFile, "Path to .riv file?");
      spinner.start(colors.muted("Parsing .riv file\u2026"));
      const meta = await inspectRive(file);
      spinner.stop(colors.success("\u2714") + " " + chalk.hex("#BBF7D0")("File parsed"));
      const out = opts.json ? JSON.stringify(meta, null, 2) : formatInspectOutput(meta);
      console.log(out);
    } catch (err) {
      spinner.stop();
      printError((err as Error).message);
      process.exit(1);
    }
    printFooter();
  });

program
  .command("scan [directory]")
  .description("Recursively scan a directory for .riv files")
  .option("--json", "Output raw JSON")
  .action(async (directory: string | undefined, opts: { json?: boolean }) => {
    printMiniHeader("scan");
    const spinner = p.spinner();
    try {
      const dir = await resolveDir(directory);
      spinner.start(colors.muted("Scanning directory\u2026"));
      const result = await scanDirectory(dir);
      spinner.stop(
        colors.success("\u2714") + " " +
        chalk.hex("#BBF7D0")("Found " + result.totalFiles + " file(s)")
      );
      const out = opts.json ? JSON.stringify(result, null, 2) : formatScanOutput(result);
      console.log(out);
    } catch (err) {
      spinner.stop();
      printError((err as Error).message);
      process.exit(1);
    }
    printFooter();
  });

program
  .command("validate [rivFile] [configFile]")
  .description("Check if a JS/TS config matches the .riv file metadata")
  .option("--json", "Output raw JSON")
  .action(async (
    rivFile: string | undefined,
    configFile: string | undefined,
    opts: { json?: boolean }
  ) => {
    printMiniHeader("validate");
    const spinner = p.spinner();
    try {
      const riv = await resolveFile(rivFile, "Path to .riv file?");
      const cfg = await resolveFile(configFile, "Path to config file (JS/TS)?");
      spinner.start(colors.muted("Validating config\u2026"));
      const result = await validateConfig(riv, cfg);
      spinner.stop(
        (result.isValid ? colors.success("\u2714") : colors.error("\u2716")) + " " +
        (result.isValid
          ? chalk.hex("#BBF7D0")("Config is valid")
          : chalk.hex("#FCA5A5")("Config has issues"))
      );
      const out = opts.json ? JSON.stringify(result, null, 2) : formatValidateOutput(result);
      console.log(out);
      if (!result.isValid) process.exit(1);
    } catch (err) {
      spinner.stop();
      printError((err as Error).message);
      process.exit(1);
    }
    printFooter();
  });

program
  .command("generate-types [rivFile]")
  .description("Auto-generate TypeScript constants from .riv metadata")
  .option("-o, --output <file>", "Write output to file instead of stdout")
  .action(async (rivFile: string | undefined, opts: { output?: string }) => {
    printMiniHeader("generate-types");
    const spinner = p.spinner();
    try {
      const file = await resolveFile(rivFile, "Path to .riv file?");

      let outFile = opts.output;
      if (!outFile) {
        const choice = await p.select({
          message: "Output destination?",
          options: [
            { value: "stdout", label: "Print to terminal" },
            { value: "file", label: "Write to a .ts file" },
          ],
        });
        if (isCancel(choice)) { p.cancel(colors.muted("Cancelled.")); process.exit(0); }
        if (choice === "file") {
          const path = await p.text({
            message: "Output file path?",
            placeholder: "./src/constants/rive-generated.ts",
            validate: (v) => ((v ?? "").trim() ? undefined : "Path is required"),
          });
          if (isCancel(path)) { p.cancel(colors.muted("Cancelled.")); process.exit(0); }
          outFile = path as string;
        }
      }

      spinner.start(colors.muted("Generating types\u2026"));
      const output = await generateTypes(file, outFile);
      spinner.stop(
        colors.success("\u2714") + " " +
        (outFile
          ? chalk.hex("#BBF7D0")("Written to " + outFile)
          : chalk.hex("#BBF7D0")("Types generated"))
      );
      if (!outFile) { console.log(); console.log(output); }
    } catch (err) {
      spinner.stop();
      printError((err as Error).message);
      process.exit(1);
    }
    printFooter();
  });

program
  .command("export-fields [rivFile]")
  .description("Extract all fields, ViewModels, and data enums from a .riv file")
  .option("--json", "Output raw JSON")
  .action(async (rivFile: string | undefined, opts: { json?: boolean }) => {
    printMiniHeader("export-fields");
    const spinner = p.spinner();
    try {
      const file = await resolveFile(rivFile, "Path to .riv file?");
      spinner.start(colors.muted("Extracting fields\u2026"));
      const result = await exportFields(file);
      spinner.stop(colors.success("\u2714") + " " + chalk.hex("#BBF7D0")("Fields extracted"));
      const out = opts.json ? JSON.stringify(result, null, 2) : formatFieldsOutput(result);
      console.log(out);
    } catch (err) {
      spinner.stop();
      printError((err as Error).message);
      process.exit(1);
    }
    printFooter();
  });

program
  .command("watch [pattern]")
  .description("Watch .riv files for changes and report diffs")
  .option("-d, --duration <seconds>", "Auto-stop after N seconds (default: run until Ctrl+C)", "0")
  .action(async (pattern: string | undefined, opts: { duration: string }) => {
    printMiniHeader("watch");
    try {
      let glob = pattern;
      if (!glob) {
        const ans = await p.text({
          message: "Glob pattern to watch?",
          placeholder: "./public/**/*.riv",
          validate: (v) => ((v ?? "").trim() ? undefined : "Pattern is required"),
        });
        if (isCancel(ans)) { p.cancel(colors.muted("Cancelled.")); process.exit(0); }
        glob = ans as string;
      }

      const durationSec = parseInt(opts.duration, 10) || 0;
      console.log();
      console.log("  " + colors.info("\u25C6") + " Watching: " + colors.highlight(glob));
      console.log(
        "  " + colors.muted("  Press Ctrl+C to stop") +
        (durationSec > 0 ? colors.muted(" \u00B7 auto-stop in " + durationSec + "s") : "")
      );
      console.log();

      const stopWatch = watchRiveFiles(
        glob,
        (diff) => { process.stdout.write(formatDiff(diff) + "\n"); },
        (err, p2) => {
          process.stderr.write(
            "  " + colors.error("\u2716") + " " + colors.muted("Error watching " + p2 + ": " + err.message) + "\n"
          );
        },
      );

      const handleExit = async () => {
        console.log();
        console.log("  " + colors.muted("Stopping watcher\u2026"));
        await stopWatch();
        printFooter();
        process.exit(0);
      };

      process.on("SIGINT", handleExit);
      process.on("SIGTERM", handleExit);

      if (durationSec > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, durationSec * 1000));
        await handleExit();
      }
    } catch (err) {
      printError((err as Error).message);
      process.exit(1);
    }
  });

program
  .command("contract-generate [rivFile]")
  .description("Generate a .rive-contract.yaml schema from a .riv file")
  .option("-o, --output <file>", "Write to file instead of stdout")
  .action(async (rivFile: string | undefined, opts: { output?: string }) => {
    printMiniHeader("contract-generate");
    const spinner = p.spinner();
    try {
      const file = await resolveFile(rivFile, "Path to .riv file?");
      spinner.start(colors.muted("Generating contract\u2026"));
      const out = await generateContract(file, opts.output);
      spinner.stop(colors.success("\u2714") + " " + chalk.hex("#BBF7D0")(opts.output ? `Written to ${opts.output}` : "Contract generated"));
      if (!opts.output) { console.log(); console.log(formatContractYaml(out)); }
    } catch (err) {
      spinner.stop();
      printError((err as Error).message);
      process.exit(1);
    }
    printFooter();
  });

program
  .command("contract-validate [rivFile] [contractFile]")
  .description("Validate a .riv file against a .rive-contract.yaml")
  .option("--json", "Output raw JSON")
  .action(async (rivFile: string | undefined, contractFile: string | undefined, opts: { json?: boolean }) => {
    printMiniHeader("contract-validate");
    const spinner = p.spinner();
    try {
      const riv = await resolveFile(rivFile, "Path to .riv file?");
      const contract = await resolveFile(contractFile, "Path to .rive-contract.yaml?");
      spinner.start(colors.muted("Validating contract\u2026"));
      const result = await validateContract(riv, contract);
      spinner.stop(
        (result.isValid ? colors.success("\u2714") : colors.error("\u2716")) + " " +
        (result.isValid ? chalk.hex("#BBF7D0")("Contract valid") : chalk.hex("#FCA5A5")("Contract violations found"))
      );
      const out = opts.json ? JSON.stringify(result, null, 2) : formatContractValidation(result);
      console.log(out);
      if (!result.isValid) process.exit(1);
    } catch (err) {
      spinner.stop();
      printError((err as Error).message);
      process.exit(1);
    }
    printFooter();
  });

program
  .command("generate-platform [rivFile]")
  .description("Generate platform-specific types (swift, kotlin, json-schema, zod, dart)")
  .option("-t, --target <target>", "Target platform")
  .option("-o, --output <file>", "Write to file instead of stdout")
  .action(async (rivFile: string | undefined, opts: { target?: string; output?: string }) => {
    printMiniHeader("generate-platform");
    const spinner = p.spinner();
    try {
      const file = await resolveFile(rivFile, "Path to .riv file?");

      let target = opts.target;
      if (!target) {
        const choice = await p.select({
          message: "Target platform?",
          options: [
            { value: "swift", label: "Swift (iOS/macOS)" },
            { value: "kotlin", label: "Kotlin (Android)" },
            { value: "json-schema", label: "JSON Schema" },
            { value: "zod", label: "Zod (TypeScript)" },
            { value: "dart", label: "Dart (Flutter)" },
          ],
        });
        if (isCancel(choice)) { p.cancel(colors.muted("Cancelled.")); process.exit(0); }
        target = choice as string;
      }

      spinner.start(colors.muted(`Generating ${target} types\u2026`));
      const out = await generateMultiplatform(file, target as import("./tools/generateMultiplatform.js").CodegenTarget, opts.output);
      spinner.stop(colors.success("\u2714") + " " + chalk.hex("#BBF7D0")(opts.output ? `Written to ${opts.output}` : "Code generated"));
      if (!opts.output) { console.log(); console.log(out); }
    } catch (err) {
      spinner.stop();
      printError((err as Error).message);
      process.exit(1);
    }
    printFooter();
  });

program
  .command("compare [fileA] [fileB]")
  .description("Compare two .riv files and detect breaking changes")
  .option("--json", "Output raw JSON")
  .action(async (fileA: string | undefined, fileB: string | undefined, opts: { json?: boolean }) => {
    printMiniHeader("compare");
    const spinner = p.spinner();
    try {
      const a = await resolveFile(fileA, "Path to baseline .riv file?");
      const b = await resolveFile(fileB, "Path to updated .riv file?");
      spinner.start(colors.muted("Comparing files\u2026"));
      const result = await compareRiveFiles(a, b);
      spinner.stop(
        (result.breakingCount > 0 ? colors.error("\u2716") : colors.success("\u2714")) + " " +
        chalk.hex("#BBF7D0")(result.summary)
      );
      const out = opts.json ? JSON.stringify(result, null, 2) : formatCompareOutput(result);
      console.log(out);
      if (result.breakingCount > 0) process.exit(1);
    } catch (err) {
      spinner.stop();
      printError((err as Error).message);
      process.exit(1);
    }
    printFooter();
  });

program
  .command("list-assets [rivFile]")
  .description("Enumerate embedded and referenced assets in a .riv file")
  .option("--json", "Output raw JSON")
  .action(async (rivFile: string | undefined, opts: { json?: boolean }) => {
    printMiniHeader("list-assets");
    const spinner = p.spinner();
    try {
      const file = await resolveFile(rivFile, "Path to .riv file?");
      spinner.start(colors.muted("Extracting assets\u2026"));
      const result = await listAssets(file);
      spinner.stop(colors.success("\u2714") + " " + chalk.hex("#BBF7D0")("Assets extracted"));
      const out = opts.json ? JSON.stringify(result, null, 2) : formatAssetsOutput(result);
      console.log(out);
    } catch (err) {
      spinner.stop();
      printError((err as Error).message);
      process.exit(1);
    }
    printFooter();
  });

program
  .command("init [directory]")
  .description("Scaffold a .rive-playground/ project directory")
  .option("--force", "Overwrite existing .rive-playground/ without confirmation")
  .action(async (directory: string | undefined, opts: { force?: boolean }) => {
    printMiniHeader("init");
    const dir = resolve(directory ?? ".");
    const playgroundDir = join(dir, ".rive-playground");

    try {
      if (existsSync(playgroundDir) && !opts.force) {
        const confirmed = await p.confirm({
          message: ".rive-playground/ already exists. Overwrite?",
          initialValue: false,
        });
        if (isCancel(confirmed) || !confirmed) {
          p.cancel(colors.muted("Cancelled."));
          process.exit(0);
        }
      }

      const projectName = await p.text({
        message: "Project name?",
        placeholder: "My Rive Project",
        validate: (v) => ((v ?? "").trim() ? undefined : "Name is required"),
      });
      if (isCancel(projectName)) { p.cancel(colors.muted("Cancelled.")); process.exit(0); }

      mkdirSync(join(playgroundDir, "presets"), { recursive: true });
      mkdirSync(join(playgroundDir, "contracts"), { recursive: true });
      mkdirSync(join(playgroundDir, "schedules"), { recursive: true });

      writeFileSync(join(playgroundDir, "presets", ".gitkeep"), "");
      writeFileSync(join(playgroundDir, "contracts", ".gitkeep"), "");
      writeFileSync(join(playgroundDir, "schedules", ".gitkeep"), "");

      const config = {
        version: "1.1.0",
        project: (projectName as string).trim(),
        created: new Date().toISOString(),
        defaultArtboard: null,
        defaultStateMachine: null,
      };
      writeFileSync(join(playgroundDir, "config.json"), JSON.stringify(config, null, 2) + "\n");

      console.log();
      console.log("  " + colors.success("\u2714") + " " + chalk.hex("#BBF7D0")(".rive-playground/ created"));
      console.log("  " + colors.muted("  presets/    \u2014 save named configurations here"));
      console.log("  " + colors.muted("  contracts/  \u2014 rive-contract.yaml files here"));
      console.log("  " + colors.muted("  schedules/  \u2014 time-based config schedules here"));
      console.log("  " + colors.muted("  config.json \u2014 project settings"));
    } catch (err) {
      printError((err as Error).message);
      process.exit(1);
    }
    printFooter();
  });

printBanner();
program.parseAsync(process.argv);
