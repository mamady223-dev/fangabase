export type CreateModeOptions = {
  agent?: boolean;
  config?: string;
  brief?: string;
  answers?: string;
  destination?: string;
  productDocs?: string;
  force?: boolean;
  yes?: boolean;
  dryRun?: boolean;
};

export function shouldUseAutomaticAgentMode(
  stdinIsTTY: boolean,
  options: CreateModeOptions,
): boolean {
  return (
    !stdinIsTTY &&
    !options.agent &&
    !options.config &&
    !options.brief &&
    !options.answers &&
    !options.destination &&
    !options.productDocs &&
    !options.force &&
    !options.yes &&
    !options.dryRun
  );
}
