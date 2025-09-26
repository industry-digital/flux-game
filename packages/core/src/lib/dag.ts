type DependencyResolver<T> = (item: T) => T[];

type CycleDetectionResult<T> = {
  cycle?: T[];
};

export const detectCycles = <T>(array: T[], getDependencies: DependencyResolver<T>): CycleDetectionResult<T> => {
  const arraySet = new Set(array);
  const temporaryMarks: Set<T> = new Set();
  const permanentMarks: Set<T> = new Set();
  const path: T[] = [];

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
      if (arraySet.has(dependency) && visit(dependency)) {
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
        return { cycle: path.slice(cycleStart) };
      }
    }
  }

  return {};
};

export const topologicalSort = <T>(array: T[], getDependencies: DependencyResolver<T>): T[] => {
 const arraySet = new Set(array);
 const sorted: T[] = [];
 const visited: Set<T> = new Set();

 const visit = (item: T) => {
   if (!visited.has(item)) {
     visited.add(item);
     getDependencies(item)
       .filter(dep => arraySet.has(dep)) // Only visit dependencies in array
       .forEach(visit);
     sorted.push(item);
   }
 };

 array.forEach(visit);
 return sorted.reverse();
};

export const safeTopologicalSort = <T>(array: T[], getDependencies: (item: T) => T[]): T[] => {
  const arraySet = new Set(array);

  // Check for missing dependencies
  for (const item of array) {
    for (const dep of getDependencies(item)) {
      if (!arraySet.has(dep)) {
        throw new Error(`Item depends on another item that is not in the array`);
      }
    }
  }

  const { cycle } = detectCycles(array, getDependencies);
  if (cycle) {
    const message = `Cycle detected in dependencies`;
    console.error(message,  cycle.map(node => String(node)).join(' -> '));
    throw new Error(message);
  }

  return topologicalSort(array, getDependencies);
};
