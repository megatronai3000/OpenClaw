const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createDecision(task, agent, outputs) {
  const decisionId = `decision-${crypto.randomUUID().slice(0, 8)}`;
  const decisionPath = path.join(
    process.env.HOME, 
    '.openclaw', 
    'shared-context', 
    'decisions', 
    `${decisionId}.md`
  );
  
  const content = `# Decision: ${task.title}

**Date:** ${new Date().toISOString().split('T')[0]}
**Agent:** ${agent}
**Status:** 🟡 Pending Approval

## Summary
${task.description}

## Deliverables
${outputs.map(o => `- [${o.filename}](${o.path})`).join('\n')}

## Recommendation
Review outputs and approve to proceed.

---

## Decision Options

- [ ] **APPROVE** — Accept work and proceed
- [ ] **ITERATE** — Request changes (specify below)
- [ ] **REJECT** — Does not meet requirements

---

**Decision Notes:**

*Raleigh to fill in after review*
`;

  // Ensure decisions directory exists
  const decisionsDir = path.join(process.env.HOME, '.openclaw', 'shared-context', 'decisions');
  if (!fs.existsSync(decisionsDir)) {
    fs.mkdirSync(decisionsDir, { recursive: true });
  }

  fs.writeFileSync(decisionPath, content);
  console.log(`Decision created: ${decisionPath}`);
  return decisionId;
}

module.exports = { createDecision };
