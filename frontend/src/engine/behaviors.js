/**
 * Animal AI — state machine and decision logic.
 * Public facade kept stable while the implementation lives under ./behaviors/.
 */
export { decideAndAct, giveBirth } from './behaviors/index.js';