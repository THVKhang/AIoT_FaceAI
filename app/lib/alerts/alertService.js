import { fetchAlertInputs } from "./alertRepository";
import { evaluateAlerts } from "./alertEvaluator";

export async function getAlertSnapshot() {
  const input = await fetchAlertInputs();
  return evaluateAlerts(input.gauges, input.states);
}
