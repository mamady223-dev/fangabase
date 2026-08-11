import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  interactiveAnswer,
  isQuestionVisible,
  questionRegistry,
  serializeConfig,
  type Answers,
} from "./questions.js";

export async function promptConfigYaml(): Promise<string> {
  const io = stdin.isTTY
    ? createInterface({ input: stdin, output: stdout })
    : null;
  const inputLines = io ? null : (await readAllStdin()).split(/\r?\n/);
  let inputIndex = 0;
  const ask = async (prompt: string): Promise<string> => {
    if (io) return io.question(prompt);
    stdout.write(prompt);
    return inputLines?.[inputIndex++] ?? "";
  };
  try {
    const answers: Answers = {};
    for (const question of questionRegistry) {
      if (!isQuestionVisible(question, answers)) continue;
      answers[question.id] = interactiveAnswer(
        question,
        await ask(question.interactive_prompt(answers)),
        answers,
      );
    }
    return serializeConfig(answers);
  } finally {
    io?.close();
  }
}

export async function promptDestination(): Promise<string> {
  if (!stdin.isTTY)
    throw new Error("--destination est obligatoire en mode non interactif.");
  const io = createInterface({ input: stdin, output: stdout });
  try {
    const value = (await io.question("Dossier de destination: ")).trim();
    if (!value) throw new Error("Le dossier de destination est obligatoire.");
    return value;
  } finally {
    io.close();
  }
}

export async function promptConfirmation(): Promise<boolean> {
  if (!stdin.isTTY) return false;
  const io = createInterface({ input: stdin, output: stdout });
  try {
    return (
      (await io.question("Créer ce projet ? Tapez OUI pour confirmer: "))
        .trim()
        .toUpperCase() === "OUI"
    );
  } finally {
    io.close();
  }
}

async function readAllStdin(): Promise<string> {
  let value = "";
  for await (const chunk of stdin) value += chunk.toString();
  return value;
}
