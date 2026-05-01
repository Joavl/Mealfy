"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPubliclyVisibleFamily = void 0;
const isPubliclyVisibleFamily = (family) => {
    // Family must be approved to be public
    if (family.status !== 'approved')
        return false;
    // Support status must be eligible (not suspended or rejected)
    return family.supportStatus !== 'rejected' &&
        family.supportStatus !== 'suspended';
};
exports.isPubliclyVisibleFamily = isPubliclyVisibleFamily;
