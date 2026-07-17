/* Shared demo data — the NovaVault specimen, detector base, monitoring feed */

export const CODE: string[] = [
  '<span class="c">// SPDX-License-Identifier: MIT</span>',
  '<span class="k">pragma solidity</span> ^0.8.19;',
  '',
  '<span class="k">import</span> {IPriceOracle} <span class="k">from</span> <span class="s">"./interfaces/IPriceOracle.sol"</span>;',
  '',
  '<span class="k">contract</span> <span class="t">NovaVault</span> {',
  '    <span class="k">mapping</span>(<span class="t">address</span> => <span class="t">uint256</span>) <span class="k">public</span> shares;',
  '    <span class="t">IPriceOracle</span> <span class="k">public</span> oracle;',
  '    <span class="t">address</span> <span class="k">public</span> guardian;',
  '',
  '    <span class="k">function</span> withdraw(<span class="t">uint256</span> amount) <span class="k">external</span> {',
  '        <span class="k">require</span>(shares[msg.sender] >= amount, <span class="s">"insufficient"</span>);',
  '        (<span class="t">bool</span> ok, ) = msg.sender.call{value: amount}(<span class="s">""</span>);',
  '        <span class="k">require</span>(ok, <span class="s">"transfer failed"</span>);',
  '        shares[msg.sender] -= amount;',
  '    }',
  '',
  '    <span class="k">function</span> price() <span class="k">public view returns</span> (<span class="t">uint256</span>) {',
  '        (, <span class="t">int256</span> p,,,) = oracle.latestRoundData();',
  '        <span class="k">return</span> <span class="t">uint256</span>(p);',
  '    }',
  '',
  '    <span class="k">function</span> setGuardian(<span class="t">address</span> g) <span class="k">external</span> { guardian = g; }',
  '}',
]

export interface Finding { idx: number; sev: string; chip: string; sub: string }
export const FINDINGS: Finding[] = [
  { idx: 1,  sev: 'low',  chip: 'L-01 FLOATING PRAGMA',   sub: 'pin the compiler' },
  { idx: 12, sev: 'crit', chip: 'C-01 REENTRANCY',        sub: 'state update after call' },
  { idx: 18, sev: 'high', chip: 'H-01 STALE ORACLE',      sub: 'no staleness check' },
  { idx: 22, sev: 'med',  chip: 'M-01 NO ACCESS CONTROL', sub: 'setGuardian() is open' },
]

export const SCAN_PHASES: [number, string][] = [
  [0.00, 'PULLING SPECIMEN…'],
  [0.06, 'LAYER 1/3 — STATIC SWEEP · 247 DETECTORS'],
  [0.42, 'LAYER 2/3 — SYMBOLIC EXECUTION · 2,904 PATHS'],
  [0.66, 'LAYER 3/3 — ADVERSARIAL REVIEW'],
  [0.84, 'REPORT READY — 12M 41S'],
]

export const WALL_DIST: [string, number][] = [
  ['crit', 18], ['high', 44], ['med', 61], ['low', 78], ['info', 28], ['gas', 18],
]

export const WALL_NAMES: Record<string, string[]> = {
  crit: ['Reentrancy — external call before state update', 'Delegatecall to untrusted target', 'Unprotected selfdestruct', 'Arbitrary external call with value', 'Unprotected proxy upgrade', 'Signature replay — missing nonce'],
  high: ['Oracle staleness unchecked', 'Missing access control on privileged setter', 'Unchecked low-level call return', 'Flash-loan manipulable pricing', 'ERC-4626 share inflation', 'tx.origin used for authorization', 'Frontrunnable initialization', 'Unbounded loop over user array'],
  med: ['ERC-20 approve race condition', 'Missing zero-address validation', 'Centralized pause without timelock', 'Block timestamp dependence', 'Precision loss in division order', 'Missing event on state change', 'Dirty higher-order bits', 'Unsafe downcast'],
  low: ['Floating pragma', 'Ether forcibly receivable — no sweep', 'Missing reentrancy guard on sendValue', 'Shadowed state variable', 'Implicit visibility', 'Dead code branch', 'Magic numbers', 'Redundant require'],
  info: ['Interface not prefixed with I', 'NatSpec missing on external fn', 'Non-standard event naming', 'TODO left in source'],
  gas: ['Unnecessary _msgSender() without EIP-2771', 'array[i] += x cheaper pattern', 'Storage read in loop', 'Calldata over memory for args', 'Pack structs under one slot', '++i over i++ in loops'],
}

export const WALL_FAMS: Record<string, string> = {
  crit: 'RE', high: 'HX', med: 'MD', low: 'LW', info: 'NC', gas: 'GS',
}

export const SEV_LABEL: Record<string, string> = {
  crit: 'CRITICAL', high: 'HIGH', med: 'MEDIUM', low: 'LOW', info: 'INFO', gas: 'GAS',
}

export const FEED: [string, string][] = [
  ['sys', 'pattern base updated — +3 detectors (RE-19, HX-45, GS-19)'],
  ['ok', 're-scan queued · 12 contracts under watch'],
  ['ok', '1Earth/EarthToken.sol — no new findings · score 87 holds'],
  ['med', 'NEW · M-02 timestamp dependence — staking/RewardPool.sol'],
  ['sys', '→ paged #core-eng on Slack · 41ms'],
  ['ok', 'demo/NovaVault.sol — C-01 remediation verified · score 58 → 91'],
  ['crit', 'NEW · C-11 delegatecall target unvalidated — vendor/Router.sol'],
  ['sys', '→ paged #incident-response · webhook 200'],
  ['ok', 'nightly sweep complete · 12/12 · 0 regressions'],
  ['sys', 'engine v3.2.1 rolled out — symbolic path cache warm'],
]

/* [code, name, description, severity, layer] */
export const CATALOG: [string, string, string, string, string][] = [
  ['RE-01', 'Reentrancy — state after external call', 'Flags any storage write that follows an external call in the same function, the classic drain shape.', 'crit', 'symbolic'],
  ['RE-04', 'Cross-function reentrancy', "Detects shared-state functions reachable during another function's external call window.", 'crit', 'symbolic'],
  ['RE-07', 'Read-only reentrancy', 'View functions returning mid-transaction state consumed by integrators as truth.', 'high', 'symbolic'],
  ['DC-02', 'Delegatecall to untrusted target', 'Delegatecall where the target address is user-influencable — full storage takeover.', 'crit', 'static'],
  ['SD-01', 'Unprotected selfdestruct', 'Reachable selfdestruct without ownership gate. Contract can be erased.', 'crit', 'static'],
  ['AC-03', 'Missing access control on privileged setter', 'State-changing admin functions callable by any address — intent inferred from naming and docs.', 'high', 'ai'],
  ['AC-08', 'tx.origin authorization', 'Authorization via tx.origin instead of msg.sender — phishable through intermediary contracts.', 'high', 'static'],
  ['OR-01', 'Oracle staleness unchecked', 'latestRoundData consumed without updatedAt / answeredInRound validation.', 'high', 'static'],
  ['OR-05', 'Flash-loan manipulable spot price', "Pricing from a single AMM pool's spot reserves — manipulable within one transaction.", 'crit', 'ai'],
  ['OR-09', 'Sequencer uptime unchecked (L2)', 'Chainlink L2 feeds consumed without sequencer-uptime validation window.', 'med', 'static'],
  ['UP-02', 'Unprotected proxy upgrade', 'upgradeTo reachable without auth, or missing _authorizeUpgrade override.', 'crit', 'static'],
  ['UP-06', 'Storage collision across proxy versions', 'Layout drift between implementation versions — silent state corruption.', 'high', 'symbolic'],
  ['SG-01', 'Signature replay — missing nonce', 'EIP-712 style signatures verified without a consumed nonce or deadline.', 'high', 'symbolic'],
  ['SG-04', 'Malleable ECDSA acceptance', 'ecrecover without s-range and v canonical checks.', 'med', 'static'],
  ['ER-02', 'ERC-20 approve race', 'Non-zero to non-zero allowance overwrite — double-spend under adversarial ordering.', 'med', 'static'],
  ['ER-11', 'ERC-4626 share inflation', 'First-depositor donation attack against vault share math.', 'high', 'symbolic'],
  ['ER-14', 'Fee-on-transfer accounting drift', 'Balance-diff accounting assumed equal to transfer amount.', 'med', 'symbolic'],
  ['CA-01', 'Unchecked low-level call return', 'call/delegatecall/staticcall result ignored — silent failure treated as success.', 'high', 'static'],
  ['CA-05', 'Return-bomb griefing', 'Unbounded returndata copy from untrusted callee.', 'med', 'static'],
  ['LP-02', 'Unbounded loop over user-controlled array', 'Iteration cost grows with attacker-supplied input — DoS by gas.', 'med', 'static'],
  ['TS-01', 'Block timestamp dependence', 'Value-bearing branches on block.timestamp within miner-influenceable tolerance.', 'med', 'static'],
  ['MT-03', 'Precision loss — division before multiplication', 'Integer ordering that rounds value toward zero before scaling.', 'med', 'symbolic'],
  ['MT-07', 'Unsafe downcast', 'uint256 narrowed without bounds check — silent truncation.', 'med', 'static'],
  ['IN-02', 'Frontrunnable initialization', 'initialize() callable by anyone post-deploy — ownership theft window.', 'high', 'static'],
  ['ET-01', 'Ether forcibly receivable, no sweep', 'SELFDESTRUCT-credited ETH with no withdrawal path — permanent lock.', 'low', 'static'],
  ['RG-03', 'Missing reentrancy guard on sendValue', 'OpenZeppelin sendValue used in unguarded public flow.', 'low', 'static'],
  ['PR-01', 'Floating pragma', '^ version range permits behavioral drift between builds.', 'low', 'static'],
  ['SH-02', 'Shadowed state variable', 'Local declaration shadows storage — writes silently diverge.', 'low', 'static'],
  ['EV-04', 'Missing event on privileged change', 'Admin state transitions without emitted events — unmonitorable.', 'low', 'static'],
  ['NC-28', 'Interface not prefixed with I', 'Naming convention — interfaces should read IVault, IOracle.', 'info', 'static'],
  ['NC-31', 'NatSpec missing on external surface', 'Public API without documentation blocks.', 'info', 'static'],
  ['GS-49', 'Unnecessary _msgSender()', 'Meta-transaction plumbing without EIP-2771 support configured.', 'gas', 'static'],
  ['GS-53', 'array[i] += x pattern', 'Compound assignment saves a duplicate index computation.', 'gas', 'static'],
  ['GS-12', 'Storage read inside loop', 'SLOAD per iteration where a stack cache suffices.', 'gas', 'static'],
  ['GS-31', 'Struct packing', 'Reorder members to share storage slots.', 'gas', 'static'],
  ['GS-07', 'Calldata over memory', 'External function args copied to memory needlessly.', 'gas', 'static'],
]
