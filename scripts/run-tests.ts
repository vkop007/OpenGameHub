import { runDiscoveryUnitTests } from "../tests/unit/discovery.test.ts";
import { runPipelineIntegrationTests } from "../tests/integration/pipeline.test.ts";

async function main() {
  console.log("=== Running OpenGameHub Unit & Integration Test Suites ===\n");

  const unitCount = await runDiscoveryUnitTests();
  console.log(`✔ Unit Tests Passed (${unitCount} test groups: discovery, schema, adapters, security, bridge)`);

  const integrationCount = await runPipelineIntegrationTests();
  console.log(`✔ Integration Tests Passed (${integrationCount} test groups: static build, Vite build, failure isolation, registry)`);

  console.log("\nAll unit and integration tests passed!");
}

main().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
