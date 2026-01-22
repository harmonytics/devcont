import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Detect Python project info including UV usage
 * @param {string} projectPath - Path to the project
 * @returns {{ isPython: boolean, pyprojectPath: string | null, usesUv: boolean }}
 */
function detectPythonProject(projectPath) {
  const rootPyproject = join(projectPath, 'pyproject.toml');
  const backendPyproject = join(projectPath, 'backend', 'pyproject.toml');

  let pyprojectPath = null;
  if (existsSync(rootPyproject)) {
    pyprojectPath = rootPyproject;
  } else if (existsSync(backendPyproject)) {
    pyprojectPath = backendPyproject;
  }

  if (!pyprojectPath) {
    return { isPython: false, pyprojectPath: null, usesUv: false };
  }

  // Check for UV usage via lock file or pyproject.toml content
  const hasRootLock = existsSync(join(projectPath, 'uv.lock'));
  const hasBackendLock = existsSync(join(projectPath, 'backend', 'uv.lock'));
  let usesUv = hasRootLock || hasBackendLock;

  if (!usesUv) {
    try {
      const content = readFileSync(pyprojectPath, 'utf-8');
      usesUv = content.includes('[tool.uv]') || content.includes('[dependency-groups]');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Warning: Could not read ${pyprojectPath}: ${error.message}`);
      }
    }
  }

  return { isPython: true, pyprojectPath, usesUv };
}

/**
 * Detect if project is fullstack (Python backend + Node.js frontend)
 * @param {string} projectPath - Path to the project
 * @returns {{ isFullstack: boolean, hasBackend: boolean, hasFrontend: boolean }}
 */
function detectFullstackProject(projectPath) {
  // Check for backend (Python)
  const hasBackendPyproject = existsSync(join(projectPath, 'backend', 'pyproject.toml'));
  const hasBackendRequirements = existsSync(join(projectPath, 'backend', 'requirements.txt'));
  const hasBackend = hasBackendPyproject || hasBackendRequirements;

  // Check for frontend (Node.js)
  const hasFrontendPackageJson = existsSync(join(projectPath, 'frontend', 'package.json'));
  const hasFrontend = hasFrontendPackageJson;

  return {
    isFullstack: hasBackend && hasFrontend,
    hasBackend,
    hasFrontend
  };
}

/**
 * Detect the project type based on files present
 * @param {string} projectPath - Path to the project
 * @returns {{ type: string, details: object }}
 */
export function detectProjectType(projectPath) {
  // Check for fullstack first (backend + frontend directories)
  const fullstackInfo = detectFullstackProject(projectPath);
  if (fullstackInfo.isFullstack) {
    return {
      type: 'fullstack',
      details: fullstackInfo
    };
  }

  const pythonInfo = detectPythonProject(projectPath);

  if (pythonInfo.isPython) {
    return {
      type: pythonInfo.usesUv ? 'python-uv' : 'python',
      details: pythonInfo
    };
  }

  // Check for other project types
  if (existsSync(join(projectPath, 'package.json'))) {
    return { type: 'node', details: {} };
  }
  if (existsSync(join(projectPath, 'go.mod'))) {
    return { type: 'go', details: {} };
  }
  if (existsSync(join(projectPath, 'Cargo.toml'))) {
    return { type: 'rust', details: {} };
  }

  return { type: 'generic', details: {} };
}
