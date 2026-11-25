import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from '../src/project.js';
import { materialize } from '../src/demo.js';

export { PLACEHOLDERS } from '../src/demo.js';

const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));

/** Copies tests/fixtures/<name>/<variant> to a temp dir with fake secrets filled in. */
export const fixtureDir = (name, variant) => materialize(path.join(FIXTURES, name, variant), name);

export const fixtureProject = (name, variant) => loadProject(fixtureDir(name, variant));
