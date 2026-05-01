"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankingRoutes = void 0;
const express_1 = require("express");
const ranking_service_1 = require("./ranking.service");
const rankingRoutes = (0, express_1.Router)();
exports.rankingRoutes = rankingRoutes;
rankingRoutes.get('/', async (req, res) => {
    const ranking = await ranking_service_1.RankingService.getGlobalRanking();
    return res.json(ranking);
});
