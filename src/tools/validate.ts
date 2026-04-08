import { readFileSync } from "fs";
import { resolve } from "path";
import { parseRiveFile } from "../parser/riveParser.js";
import type { ValidationResult, ValidationItem } from "../parser/types.js";
import chalk from "chalk";
import { colors, sym, brand, divider, sectionLabel } from "../ui/theme.js";

function extractStringValues(source: string): string[] {
  const matches = source.match(/"([^"\\]+)"/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))].filter(
    (s) => s.length > 1,
  );
}

function checkValue(
  value: string,
  validValues: Set<string>,
  location?: string,
): ValidationItem {
  if (validValues.has(value)) {
    return { value, status: "match", location };
  }
  return { value, status: "missing_in_riv" };
}

export async function validateConfig(
  rivFilePath: string,
  configFilePath: string,
): Promise<ValidationResult> {
  const absRiv = resolve(rivFilePath);
  const absConfig = resolve(configFilePath);

  const [meta, configSource] = await Promise.all([
    parseRiveFile(absRiv),
    Promise.resolve(readFileSync(absConfig, "utf-8")),
  ]);

  const artboardNames = new Set(meta.artboards.map((a) => a.name));
  const smNames = new Set(
    meta.artboards.flatMap((a) => a.stateMachines.map((sm) => sm.name)),
  );
  const inputNames = new Set(
    meta.artboards.flatMap((a) =>
      a.stateMachines.flatMap((sm) => sm.inputs.map((i) => i.name)),
    ),
  );

  const configStrings = extractStringValues(configSource);

  const artboardChecks: ValidationItem[] = [];
  const smChecks: ValidationItem[] = [];
  const inputChecks: ValidationItem[] = [];

  for (const str of configStrings) {
    if (artboardNames.has(str)) {
      artboardChecks.push({ value: str, status: "match" });
    } else if (smNames.has(str)) {
      smChecks.push({ value: str, status: "match" });
    } else if (inputNames.has(str)) {
      inputChecks.push({ value: str, status: "match" });
    }
  }

  const configStrSet = new Set(configStrings);

  for (const ab of meta.artboards) {
    if (
      !configStrSet.has(ab.name) &&
      artboardChecks.every((c) => c.value !== ab.name)
    ) {
      artboardChecks.push({ value: ab.name, status: "extra_in_config" });
    }
    for (const sm of ab.stateMachines) {
      if (
        !configStrSet.has(sm.name) &&
        smChecks.every((c) => c.value !== sm.name)
      ) {
        smChecks.push({ value: sm.name, status: "extra_in_config" });
      }
      for (const input of sm.inputs) {
        if (
          !configStrSet.has(input.name) &&
          inputChecks.every((c) => c.value !== input.name)
        ) {
          inputChecks.push({ value: input.name, status: "extra_in_config" });
        }
      }
    }
  }

  for (const str of configStrings) {
    const alreadyCovered =
      artboardChecks.some((c) => c.value === str) ||
      smChecks.some((c) => c.value === str) ||
      inputChecks.some((c) => c.value === str);
    if (!alreadyCovered) {
      const possibleMatch = checkValue(
        str,
        new Set([...artboardNames, ...smNames, ...inputNames]),
      );
      if (possibleMatch.status === "missing_in_riv") {
        artboardChecks.push({ value: str, status: "missing_in_riv" });
      }
    }
  }

  const missingCount = [...artboardChecks, ...smChecks, ...inputChecks].filter(
    (c) => c.status === "missing_in_riv",
  ).length;

  const isValid = missingCount === 0;
  const summary = isValid
    ? "All referenced values found in .riv file."
    : `${missingCount} value(s) referenced in config but not found in .riv file.`;

  return {
    rivFile: absRiv,
    configFile: absConfig,
    artboardChecks,
    stateMachineChecks: smChecks,
    inputChecks,
    isValid,
    summary,
  };
}

export function formatValidateOutput(result: ValidationResult): string {
  const lines: string[] = [];

  const statusIcon = (s: string) => {
    if (s === "match") return sym.ok;
    if (s === "missing_in_riv") return sym.fail;
    return sym.warn;
  };
  const statusLabel = (s: string) => {
    if (s === "match") return colors.success("match");
    if (s === "missing_in_riv") return colors.error("missing in .riv");
    if (s === "extra_in_config") return colors.warning("extra in config");
    return colors.muted(s);
  };

  lines.push("");
  lines.push(divider(58));
  lines.push("  " + brand("VALIDATE"));
  lines.push("  " + colors.secondary("riv:    ") + " " + colors.muted(result.rivFile));
  lines.push("  " + colors.secondary("config: ") + " " + colors.muted(result.configFile));
  lines.push(divider(58));

  const renderChecks = (label: string, items: ValidationItem[]) => {
    if (items.length === 0) return;
    lines.push("");
    lines.push("  " + sectionLabel(label.toUpperCase(), 54));
    for (const item of items) {
      lines.push(
        "  " + statusIcon(item.status) +
        "  " + chalk.hex("#E2E8F0")('"' + item.value + '"') +
        "  " + colors.muted("—") +
        "  " + statusLabel(item.status) +
        (item.location ? "  " + colors.muted("in " + item.location) : "")
      );
    }
  };

  renderChecks("Artboards", result.artboardChecks);
  renderChecks("State Machines", result.stateMachineChecks);
  renderChecks("Inputs", result.inputChecks);

  lines.push("");
  lines.push(divider(58));

  const verdict = result.isValid
    ? "  " + sym.ok + "  " + chalk.hex("#BBF7D0").bold("VALID") + "  " + colors.muted(result.summary)
    : "  " + sym.fail + "  " + chalk.hex("#FCA5A5").bold("INVALID") + "  " + colors.error(result.summary);
  lines.push(verdict);
  lines.push(divider(58));
  lines.push("");

  return lines.join("\n");
}
