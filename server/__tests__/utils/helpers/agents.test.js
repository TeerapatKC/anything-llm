const { skillIsAutoApproved } = require("../../../utils/helpers/agents");

describe("skillIsAutoApproved", () => {
  const original = process.env.AGENT_AUTO_APPROVED_SKILLS;

  afterEach(() => {
    if (original === undefined) delete process.env.AGENT_AUTO_APPROVED_SKILLS;
    else process.env.AGENT_AUTO_APPROVED_SKILLS = original;
  });

  it("auto-approves every skill when configured with <all>", () => {
    process.env.AGENT_AUTO_APPROVED_SKILLS = "<all>";

    expect(skillIsAutoApproved({ skillName: "filesystem-write-text-file" })).toBe(
      true
    );
    expect(skillIsAutoApproved({ skillName: "create-pdf-file" })).toBe(true);
  });

  it("keeps the default approval behavior when unset", () => {
    delete process.env.AGENT_AUTO_APPROVED_SKILLS;

    expect(skillIsAutoApproved({ skillName: "filesystem-write-text-file" })).toBe(
      false
    );
  });
});
