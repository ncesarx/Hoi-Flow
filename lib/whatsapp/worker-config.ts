export type WhatsAppWorkerConfig = {
  tenantId: string;
  phoneNumberId: string;
  accessToken: string;
  graphApiVersion: string;
  pollIntervalMs: number;
  batchSize: number;
};

type WorkerEnvironment = Record<string, string | undefined>;

function required(env: WorkerEnvironment, name: string) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} não configurado.`);
  return value;
}

function integerInRange(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  name: string,
) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${name} deve ser um inteiro entre ${minimum} e ${maximum}.`,
    );
  }
  return parsed;
}

export function readWhatsAppWorkerConfig(
  env: WorkerEnvironment,
): WhatsAppWorkerConfig {
  return {
    tenantId: required(env, "WHATSAPP_TENANT_ID"),
    phoneNumberId: required(env, "WHATSAPP_PHONE_NUMBER_ID"),
    accessToken: required(env, "WHATSAPP_ACCESS_TOKEN"),
    graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v23.0",
    pollIntervalMs: integerInRange(
      env.WHATSAPP_WORKER_POLL_MS,
      1_000,
      250,
      60_000,
      "WHATSAPP_WORKER_POLL_MS",
    ),
    batchSize: integerInRange(
      env.WHATSAPP_WORKER_BATCH_SIZE,
      50,
      1,
      100,
      "WHATSAPP_WORKER_BATCH_SIZE",
    ),
  };
}
