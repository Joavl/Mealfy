"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeString = void 0;
const normalizeString = (str) => {
    if (!str)
        return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};
exports.normalizeString = normalizeString;
