import { glob } from "glob";
import { resolve } from "path";
import { parseRiveFile } from "../parser/riveParser.js";
import type { ScanResult } from "../parser/types.js";
import { colors, sym, brand, divider, sectionLabel } from "../ui/theme.js";

export async function scanDirectory(dirPath: string): Promise<ScanResult> {
  const absDir = resolve(dirPath);
  const pattern = `${absDir}/**/*.riv`;

  const files = await glob(pattern, { nodir: true });
  const results = await Promise.allSettled(files.map((f) => parseRiveFile(f)));

  const parsed = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          filePath: files[i],
          fileSize: 0,
          artboards: [],
          parseMethod: "binary-header" as const,
          parseError:
            (r as PromiseRejectedResult).reason?.message ?? "unknown error",
        },
  );

  const failedFiles = parsed
    .filter((f) => f.parseError && f.artboards.length === 0)
    .map((f) => f.filePath);

  const uniqueArtboards = [
    ...new Set(parsed.flatMap((f) => f.artboards.map((a) => a.name))),
  ];

  const uniqueStateMachines = [
    ...new Set(
      parsed.flatMap((f) =>
        f.artboards.flatMap((a) => a.stateMachines.map((sm) => sm.name)),
      ),
    ),
  ];

  const totalAnimations = parsed.reduce(
    (sum, f) => sum + f.artboards.reduce((s, a) => s + a.animations.length, 0),
    0,
  );

  return {
    directory: absDir,
    totalFiles: files.length,
    files: parsed,
    summary: {
      uniqueArtboards,
      uniqueStateMachines,
      totalAnimations,
      failedFiles,
    },
  };
}

export function formatScanOutput(result: ScanResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(divider(58));
  lines.push(
    "  " + brand("SCAN") +
    "  " + colors.muted(result.directory)
  );
  lines.push(
    "  " +
    colors.secondary("files:") + " " + colors.primary(String(result.totalFiles)) +
    "  " + colors.muted("·") + "  " +
    colors.secondary("artboards:") + " " + colors.primary(String(result.summary.uniqueArtboards.length)) +
    "  " + colors.muted("·") + "  " +
    colors.secondary("animations:") + " " + colors.primary(String(result.summary.totalAnimations))
  );
  lines.push(divider(58));
  lines.push("");

  for (const f of result.files) {
    const kb = (f.fileSize / 1024).toFixed(1);
    const rel = f.filePath.replace(result.directory + "/", "");
    const hasError = !!f.parseError && f.artboards.length === 0;
    const status = hasError ? sym.fail : sym.ok;

    lines.push(
      "  " + status +
      "  " + colors.highlight(rel) +
      "  " + colors.muted(kb + " KB")
    );

    if (hasError) {
      lines.push("  " + "     " + colors.error(f.parseError ?? "parse error"));
    } else {
      for (const ab of f.artboards) {
        const abIcon = ab.isDefault ? sym.star : sym.circle;
        const abName = ab.isDefault ? colors.artboardDefault(ab.name) : colors.secondary(ab.name);
        const smNames = ab.stateMachines.map((sm) => colors.info(sm.name)).join(colors.muted(", "));
        const smPart = ab.stateMachines.length > 0
          ? "  " + colors.muted("sm:") + " " + smNames
          : "  " + colors.muted("no state machines");
        lines.push("       " + abIcon + " " + abName + smPart);
      }
      if (f.parseError) {
        lines.push("       " + sym.warn + " " + colors.warning(f.parseError));
      }
    }
    lines.push("");
  }

  lines.push(sectionLabel("SUMMARY", 58));
  lines.push("");
  if (result.summary.uniqueArtboards.length > 0) {
    lines.push(
      "  " + colors.secondary("artboards:") + "  " +
      result.summary.uniqueArtboards.map((a) => colors.primary(a)).join(colors.muted("  ·  "))
    );
  }
  if (result.summary.uniqueStateMachines.length > 0) {
    lines.push(
      "  " + colors.secondary("state machines:") + "  " +
      result.summary.uniqueStateMachines.map((s) => colors.info(s)).join(colors.muted("  ·  "))
    );
  }
  if (result.summary.failedFiles.length > 0) {
    lines.push(
      "  " + sym.warn + "  " +
      colors.warning(result.summary.failedFiles.length + " file(s) failed to parse")
    );
  }
  lines.push("");
  lines.push(divider(58));
  lines.push("");

  return lines.join("\n");
}
