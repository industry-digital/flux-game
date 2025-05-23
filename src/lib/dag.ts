type DependencyResolver<T> = (item: T) => T[];

export const detectCycles = <T>(array: T[], getDependencies: DependencyResolver<T>): T[] | null => {
  const temporaryMarks: Set<T> = new Set();
  const permanentMarks: Set<T> = new Set();
  const path: T[] = []; // To track the cycle path

  const visit = (item: T): boolean => {
    if (permanentMarks.has(item)) {
      return false;
    }

    if (temporaryMarks.has(item)) {
      path.push(item);
      return true;
    }

    temporaryMarks.add(item);
    path.push(item);

    for (const dependency of getDependencies(item)) {
      if (visit(dependency)) {
        return true;
      }
    }

    temporaryMarks.delete(item);
    permanentMarks.add(item);
    path.pop();

    return false;
  };

  for (const item of array) {
    if (!permanentMarks.has(item)) {
      path.length = 0;
      if (visit(item)) {
        const cycleStart = path.findIndex(node => node === path[path.length - 1]);
        return path.slice(cycleStart);
      }
    }
  }

  return null;
};

export const topologicalSort = <T>(array: T[], getDependencies: DependencyResolver<T>): T[] => {
  const sorted: T[] = [];
  const visited: Set<T> = new Set();

  const visit = (item: T) => {
    if (!visited.has(item)) {
      visited.add(item);
      getDependencies(item).forEach(visit);
      sorted.push(item);
    }
  };

  array.forEach(visit);
  return sorted.reverse();
};

export const safeTopologicalSort = <T>(array: T[], getDependencies: (item: T) => T[]): T[] => {
  const arraySet = new Set(array);

  // Throw if
  for (const item of array) {
    for (const dep of getDependencies(item)) {
      if (!arraySet.has(dep)) {
        throw new Error(`Handler ${item.constructor.name} depends on ${dep.constructor.name}, which is not in the handlers array`);
      }
    }
  }

  const cycle = detectCycles(array, getDependencies);
  if (cycle) {
    const cycleNames = cycle.map(item => item.constructor.name).join(' -> ');
    throw new Error(`Cycle detected in handler dependencies: ${cycleNames}`);
  }

  return topologicalSort(array, getDependencies);
};
