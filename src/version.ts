export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export function parseVersion(version: string): Version | null {
  try {
    if (version.startsWith("v")) version = version.slice(1);
    version = version.split("-").shift()!;
    const [major, minor, patch] = version.split(".").map((e) => parseInt(e));
    if (isNaN(major) || isNaN(minor) || isNaN(patch)) return null;
    return { major, minor, patch };
  } catch (_) {
    return null;
  }
}
