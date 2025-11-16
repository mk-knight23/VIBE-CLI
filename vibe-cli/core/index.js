// Bridge file to allow directory requires (require('../core')) to resolve.
// Keeps authoritative barrel in index.cjs without rewriting all existing require paths.
'use strict';
module.exports = require('./index.cjs');