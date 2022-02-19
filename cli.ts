import { parse } from "./deps.ts";
import { analyze } from "./src/analyzer.ts";

const args = parse(Deno.args);

if (!args._.length) {
  console.log(
    "%cerror%c: Specify a root specifier for module to analyze dependencies.",
    "color: red",
    "",
  );
} else {
  const results = await analyze(String(args._[0]), (spec) => {
    console.log("%cAnalyze%c " + spec, "color: green", "");
  });

  if (!results.length) {
    console.log("%cSuccess %cNo issues found! 🎉", "color: green", "");
    Deno.exit(0);
  }

  let fixable = 0;

  const toFix = Boolean(args.fix || args.f);

  for (let i = 0; i < results.length; i++) {
    console.log();
    const result = results[i];
    let fixed = false;
    if (result.fix) {
      fixable++;
      if (toFix) {
        await result.fix();
        fixed = true;
      }
    }
    console.log(
      `%cwarning%c${fixed ? " (fixed)" : ""}: ${result.message}`,
      "color: yellow",
      "",
      ...(result.colors ?? []).map((e) => `color: ${e}`),
    );
    if (result.loc) {
      console.log(
        `  at %c${result.loc.mod.href}%c:%c${
          result.loc.range.start.line + 1
        }%c:%c${result.loc.range.start.character + 1}`,
        "color: cyan",
        "",
        "color: yellow",
        "",
        "color: yellow",
      );
    }
    if (i === results.length - 1) console.log();
  }

  console.log(
    `⚠️  Found ${results.length} issue${
      results.length === 1 ? "" : "s"
    }, ${fixable} ${toFix ? "fixed" : "fixable using --fix"}${
      toFix && fixable === results.length ? ". All issues fixed! 🎉" : ""
    }`,
  );
}
