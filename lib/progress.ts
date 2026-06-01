type Handler = (active: boolean) => void;

const handlers = new Set<Handler>();
let pending = 0;

export const topProgress = {
  start() {
    pending++;
    handlers.forEach((h) => h(true));
  },
  done() {
    pending = Math.max(0, pending - 1);
    if (pending === 0) handlers.forEach((h) => h(false));
  },
  subscribe(fn: Handler): () => void {
    handlers.add(fn);
    return () => handlers.delete(fn);
  },
};
