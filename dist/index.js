"use strict";
/**
 * VIBE CLI v0.0.1 - Main Export
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIBE_VERSION = void 0;
exports.VIBE_VERSION = '0.0.1';
// Core
__exportStar(require("./core/config-system"), exports);
__exportStar(require("./utils/structured-logger"), exports);
// Adapters
__exportStar(require("./adapters/types"), exports);
__exportStar(require("./adapters/router"), exports);
// Primitives
__exportStar(require("./primitives/types"), exports);
__exportStar(require("./primitives/completion"), exports);
__exportStar(require("./primitives/planning"), exports);
__exportStar(require("./primitives/execution"), exports);
__exportStar(require("./primitives/multi-edit"), exports);
__exportStar(require("./primitives/approval"), exports);
__exportStar(require("./primitives/memory"), exports);
__exportStar(require("./primitives/determinism"), exports);
__exportStar(require("./primitives/orchestration"), exports);
// CLI
__exportStar(require("./cli/main"), exports);
//# sourceMappingURL=index.js.map