import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VERSION_MARKER_COUNT,
  writeVersionContract,
} from './version-contract.mjs';

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  const version = process.argv[2];
  const contract = await writeVersionContract(process.cwd(), version);
  console.log(
    `YeMind version ${contract.expected} written to ${VERSION_MARKER_COUNT} release markers.`,
  );
}
