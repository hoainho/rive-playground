import { parseRiveFile } from "../parser/riveParser.js";
import type { RiveFileMetadata } from "../parser/types.js";
import { colors, sym, typeBadge, divider, sectionLabel, brand } from "../ui/theme.js";
import chalk from "chalk";
import path from "path";

export async function inspectRive(filePath: string): Promise<RiveFileMetadata> {
  return parseRiveFile(filePath);
}

export function formatInspectOutput(meta: RiveFileMetadata): string {
  const lines: string[] = [];
  const kb = (meta.fileSize / 1024).toFixed(1);
  const filename = path.basename(meta.filePath);
  const dir = path.dirname(meta.filePath);

  lines.push("");
  lines.push(divider(58));

  const titleLine =
    "  " +
    brand(filename) +
    "  " +
    colors.muted(dir);
  lines.push(titleLine);

  const metaFields: string[] = [];
  metaFields.push(colors.secondary("size:") + " " + colors.primary(kb + " KB"));
  if (meta.riveVersion) {
    metaFields.push(
      colors.secondary("rive:") +
        " " +
        colors.primary(`v${meta.riveVersion.major}.${meta.riveVersion.minor}`)
    );
  }
  metaFields.push(
    colors.secondary("parser:") + " " + colors.muted(meta.parseMethod)
  );
  lines.push("  " + metaFields.join("  " + colors.muted("·") + "  "));

  if (meta.parseError) {
    lines.push(
      "  " + sym.warn + " " + chalk.hex("#FDE68A")(meta.parseError)
    );
  }

  lines.push(divider(58));

  if (meta.artboards.length === 0) {
    lines.push("  " + colors.muted("No artboards found."));
    lines.push("");
    return lines.join("\n");
  }

  lines.push(
    "  " +
      sectionLabel(
        `ARTBOARDS  ${colors.muted(String(meta.artboards.length))}`,
        56
      )
  );

  for (const ab of meta.artboards) {
    lines.push("");

    const abIcon = ab.isDefault ? sym.star : sym.circle;
    const abName = ab.isDefault
      ? colors.artboardDefault(ab.name)
      : colors.primary(ab.name);
    const abSize = colors.muted(`${ab.width}×${ab.height}`);
    const abDefault = ab.isDefault
      ? "  " + chalk.hex("#FBBF24").dim("default")
      : "";
    lines.push(`  ${abIcon} ${abName}  ${abSize}${abDefault}`);

    if (ab.animations.length > 0) {
      lines.push(
        "  " +
          sym.tree +
          "  " +
          colors.secondary("animations") +
          "  " +
          colors.muted(`(${ab.animations.length})`)
      );
      for (let i = 0; i < ab.animations.length; i++) {
        const anim = ab.animations[i];
        const isLast = i === ab.animations.length - 1 && ab.stateMachines.length === 0;
        const branch = isLast ? sym.treeLast : sym.treeBranch;
        const dur =
          anim.duration > 0
            ? colors.info(`${anim.duration.toFixed(2)}s`)
            : colors.muted("—");
        const fps = colors.muted(`@ ${anim.fps}fps`);
        const loopBadge =
          anim.loopType === "loop" ? colors.typeEnum("↺")
          : anim.loopType === "pingPong" ? colors.typeColor("⟷")
          : colors.muted("↗");
        lines.push(
          "  " +
            sym.tree +
            "  " +
            branch +
            " " +
            colors.primary(anim.name) +
            "  " +
            dur +
            "  " +
            fps +
            "  " +
            loopBadge
        );
      }
    }

    if (ab.stateMachines.length > 0) {
      lines.push(
        "  " +
          sym.tree +
          "  " +
          colors.secondary("state machines") +
          "  " +
          colors.muted(`(${ab.stateMachines.length})`)
      );
      for (let si = 0; si < ab.stateMachines.length; si++) {
        const sm = ab.stateMachines[si];
        const isLastSM = si === ab.stateMachines.length - 1;
        const smBranch = isLastSM ? sym.treeLast : sym.treeBranch;
        lines.push(
          "  " +
            sym.tree +
            "  " +
            smBranch +
            " " +
            colors.highlight(sm.name) +
            "  " +
            colors.muted(`${sm.inputs.length} input${sm.inputs.length !== 1 ? "s" : ""}`)
        );

        const smTree = isLastSM ? "     " : sym.tree + "  ";
        for (let ii = 0; ii < sm.inputs.length; ii++) {
          const input = sm.inputs[ii];
          const isLastInput = ii === sm.inputs.length - 1;
          const iBranch = isLastInput ? sym.treeLast : sym.treeBranch;
          const badge = typeBadge(input.type);
          const defVal =
            input.defaultValue !== undefined
              ? "  " + colors.muted("=") + " " + chalk.hex("#FDE68A")(String(input.defaultValue))
              : "";
          lines.push(
            "  " +
              sym.tree +
              "  " +
              smTree +
              iBranch +
              " " +
              badge +
              " " +
              colors.primary(input.name) +
              defVal
          );
        }
      }
    }
  }

  lines.push("");
  lines.push(divider(58));
  lines.push("");

  return lines.join("\n");
}
