require("dotenv").config({ path: ".env.development" });
process.env.STORAGE_DIR = require("path").resolve(__dirname, "storage");

(async () => {
  const { Workspace } = require("./models/workspace");

  const specs = [
    {
      name: "ซ่อมบำรุงแอร์และเครื่องจักร",
      sqlConnectionId: "repair_maintenance",
    },
    {
      name: "Solar Plant Monitoring",
      sqlConnectionId: "solar_plant",
    },
    {
      name: "Log Monitoring",
      sqlConnectionId: "log_monitoring",
    },
  ];

  for (const spec of specs) {
    const { workspace, message } = await Workspace.new(spec.name, null, {
      agentSkillConfig: JSON.stringify({
        activeSqlConnections: [spec.sqlConnectionId],
      }),
    });
    if (!workspace) {
      console.log("FAILED to create", spec.name, message);
      continue;
    }
    console.log(`created workspace: ${spec.name} -> slug=${workspace.slug} id=${workspace.id}`);
  }
})();
