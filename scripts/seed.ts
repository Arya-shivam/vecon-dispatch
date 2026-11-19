import { mutate } from "../lib/store";
import { seedState } from "../lib/seed";
await mutate((state) => {
  if (state.jobs.length || state.masters.length)
    throw new Error("Seed only runs against an empty workspace.");
  const seed = seedState();
  state.jobs = seed.jobs;
  state.masters = seed.masters;
});
process.stdout.write("Sample workspace created.\n");
process.exit(0);
