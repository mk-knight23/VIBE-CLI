export type Event =
  | { event: "token"; data: string; id?: string }
  | { event: "tool.request"; data: any }
  | { event: "tool.response"; data: any }
  | { event: "file.create" | "file.write" | "file.delete" | "folder.create"; data: any }
  | { event: "patch"; data: { file: string; diff: string } }
  | { event: "shell.stdout" | "shell.stderr"; data: string; id?: string }
  | { event: "runtime.stdout" | "runtime.stderr" | "runtime.exit"; data: any; id?: string }
  | { event: "audit"; data: any }
  | { event: "complete"; data: any };

export function emitEvent(event: Event): void {
  if (process.env.VIBE_JSON_OUTPUT === 'true') {
    console.log(JSON.stringify(event));
  }
}

export function parseNDJSON(line: string): Event | null {
  try {
    return JSON.parse(line) as Event;
  } catch {
    return null;
  }
}
