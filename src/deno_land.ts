export interface DenoLandVersions {
  latest: string;
  versions: string[];
}

export async function fetchDenoLandVersions(
  name: string,
): Promise<DenoLandVersions> {
  return await fetch(`https://cdn.deno.land/${name}/meta/versions.json`).then(
    (e) => e.json(),
  );
}
