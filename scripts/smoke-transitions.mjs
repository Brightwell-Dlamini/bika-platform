/** Pure logic smoke: status transition graph + acknowledge rules. */
import assert from 'node:assert/strict';

const ALLOWED = {
  submitted: ['triaged', 'assigned', 'in_progress', 'rejected', 'escalated'],
  triaged: ['assigned', 'in_progress', 'awaiting_info', 'rejected', 'escalated'],
  assigned: ['in_progress', 'awaiting_info', 'resolved', 'escalated', 'triaged'],
  in_progress: ['resolved', 'awaiting_info', 'escalated', 'closed'],
  awaiting_info: ['in_progress', 'resolved', 'rejected'],
  escalated: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
  rejected: [],
};

function canTransition(from, to) {
  return (ALLOWED[from] ?? []).includes(to);
}

function canAcknowledge(status) {
  return ['submitted', 'triaged', 'assigned'].includes(status);
}

assert.equal(canTransition('submitted', 'in_progress'), true);
assert.equal(canTransition('submitted', 'closed'), false);
assert.equal(canTransition('resolved', 'closed'), true);
assert.equal(canTransition('closed', 'in_progress'), false);
assert.equal(canAcknowledge('submitted'), true);
assert.equal(canAcknowledge('in_progress'), false);
assert.equal(canAcknowledge('resolved'), false);

console.log('smoke-transitions: OK');
