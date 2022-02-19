import { createGraph, RangeJson } from "../deps.ts";
import { fetchDenoLandVersions } from "./deno_land.ts";
import { parseVersion } from "./version.ts";

export interface ResultLoc {
  mod: URL;
  range: RangeJson;
}

export interface Result {
  message: string;
  colors?: string[];
  fix?: CallableFunction;
  loc?: ResultLoc;
}

export async function handleDependency(
  mod: URL,
  dep: URL,
  range: RangeJson,
  results: Result[],
) {
  // Check for outdated versions for known hosts.
  if (
    dep.hostname === "deno.land" &&
    (dep.pathname.startsWith("/std") || dep.pathname.startsWith("/x/"))
  ) {
    let name: string, version: string;
    let slice = 0;
    if (dep.pathname.startsWith("/std")) {
      // Std Lib
      slice = 2;
      name = "std";
      const spec = dep.pathname.split("/")[1].split("@");
      version = spec[1] ?? "";
    } else {
      // Third Party Module
      slice = 3;
      const spec = dep.pathname.split("/")[2].split("@");
      name = spec[0];
      version = spec[1] ?? "";
    }

    const meta = await fetchDenoLandVersions(name);

    if (!version) {
      results.push({
        message:
          `Found deno.land dependency %c${name} %cwithout pinned version! Consider using a version like %c${meta.latest}`,
        colors: ["green", "", "green"],
        loc: { mod, range },
        fix: async () => {
          const file = await Deno.readTextFile(mod);
          await Deno.writeTextFile(
            mod,
            file.replaceAll(
              `https://deno.land/${name === "std" ? "std" : `x/${name}`}/`,
              `https://deno.land/${
                name === "std" ? "std" : `x/${name}`
              }@${meta.latest}/`,
            ),
          );
        },
      });
      return;
    }

    const parsed = parseVersion(version);
    if (!parsed) {
      return;
    }

    const latest = parseVersion(meta.latest);
    if (!latest) {
      return;
    }

    if (
      parsed.major < latest.major || parsed.minor < latest.minor ||
      parsed.patch < latest.patch
    ) {
      results.push({
        message:
          `Found deno.land dependency %c${name} %coutdated! Latest version is %c${meta.latest}%c, but you're using %c${version}`,
        colors: ["green", "", "green", "", "green"],
        loc: { mod, range },
        fix: async () => {
          const file = await Deno.readTextFile(mod);
          await Deno.writeTextFile(
            mod,
            file.replace(
              `https://deno.land/${
                name === "std" ? "std" : `x/${name}`
              }@${version}/`,
              `https://deno.land/${
                name === "std" ? "std" : `x/${name}`
              }@${meta.latest}/`,
            ),
          );
        },
      });
    }
  } else if (dep.hostname === "code.harmony.rocks") {
    const version = dep.pathname.split("/")[1] ?? "";
    const parsed = parseVersion(version);
    if (!parsed) return;
    const meta = await fetchDenoLandVersions("harmony");
    const latest = parseVersion(meta.latest);
    if (!latest) return;
    if (
      parsed.major < latest.major || parsed.minor < latest.minor ||
      parsed.patch < latest.patch
    ) {
      results.push({
        message:
          `Found Harmony version outdated! Latest version is %c${meta.latest}%c, but you're using %c${version}`,
        colors: ["green", "", "green"],
        loc: { mod, range },
        fix: async () => {
          const file = await Deno.readTextFile(mod);
          await Deno.writeTextFile(
            mod,
            file.replace(
              `https://code.harmony.rocks/${version}`,
              `https://code.harmony.rocks/${meta.latest}`,
            ),
          );
        },
      });
    }
  }
}

export async function analyze(
  rootSpec: string,
  onStart: (spec: string) => void,
) {
  const results: Result[] = [];

  let spec: URL;
  if (rootSpec.startsWith("/")) {
    spec = new URL(`file://${rootSpec}`);
  } else {
    if (rootSpec.startsWith("./")) rootSpec = rootSpec.slice(2);
    spec = new URL(
      `file://${
        Deno.build.os === "windows"
          ? `/${Deno.cwd().replaceAll("\\", "/")}`
          : Deno.cwd()
      }/${rootSpec}`,
    );
  }

  if (!(await Deno.lstat(spec).catch(() => false))) {
    throw new Error(`Module not found! URL: ${spec.href}`);
  }
  onStart(spec.href);
  const graph = await createGraph(spec.href);

  for (const mod of graph.modules) {
    // Ignore remote modules
    if (!mod.specifier.startsWith("file://")) continue;

    const modUrl = new URL(mod.specifier);

    for (const dep in mod.dependencies ?? {}) {
      const depData = mod.dependencies![dep];
      // Ignore non-remote dependencies
      if (!dep.startsWith("https://")) continue;
      const depUrl = new URL(dep);
      if (!depData.code) continue;
      const range = depData.code.span;
      await handleDependency(modUrl, depUrl, range, results);
    }
  }

  return results;
}
