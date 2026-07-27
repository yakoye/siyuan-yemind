import {
  assertVersionContract,
  readVersionContract,
  VERSION_MARKER_COUNT,
} from './release/version-contract.mjs';

try {
  const contract = await readVersionContract(process.cwd());
  const version = assertVersionContract(contract);
  console.log(
    `YeMind version ${version} is consistent across ${VERSION_MARKER_COUNT} release markers.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
