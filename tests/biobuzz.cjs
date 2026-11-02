const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = ts.createSourceFile("app.ts", fs.readFileSync("static/assets/app.ts", "utf8"), ts.ScriptTarget.Latest, true);
const functions = source.statements.filter(ts.isFunctionDeclaration).map(node => node.getText(source)).join("\n");
const context = vm.createContext({ console, Date, Math });
vm.runInContext(ts.transpile(functions, { target: ts.ScriptTarget.ES2022 }), context);

const blue = {
    alliance: "Blue", autoHiveTips: 2, autoLeavePoints: 6, autoParkPoints: 10,
    autoHivePoints: 40, autoPoints: 56, teleopHiveTips: 3,
    teleopHivePollenNectar: 4, teleopHivePoints: 68, teleopFlowerPoints: 14,
    teleopGardenPollenNectar: 8, teleopGardenPoints: 8, teleopParkPoints: 5,
    teleopPoints: 95, totalPoints: 161, preFoulTotal: 151,
    autoRobot1Leave: true, autoRobot2Leave: true, autoRobot1Park: true,
    autoRobot2Park: true, teleopRobot1Park: true, teleopRobot2Park: false,
    swarmRP: true, pollinator1RP: true, pollinator2RP: false,
    redAllianceFlower: [], scoringFlower: ["BLUE_NECTAR", "POLLEN"],
    blueAllianceFlower: null, audienceFlower: [], foulPointsCommitted: 0
};
const red = { ...blue, alliance: "Red", totalPoints: 100, foulPointsCommitted: 10 };
const match = { matchNumber: 1, matchLevel: "QUALIFICATION", teamAlliance: "Blue", alliances: [red, blue] };
const jobs = [];
const html = context.renderAllianceBreakdown(match, "blue", jobs);
assert.match(html, /161/);
assert.match(html, /Blue nectar · Pollen/);
assert.match(html, /Auto Park/);
assert.match(html, /Pollinator 1/);
assert.doesNotMatch(html, /Artifact|Classifier|Pattern|undefined|NaN/);
let segments;
context.renderDonutChart = (id, values) => { segments = values; };
jobs[0]();
assert.equal(segments.reduce((sum, value) => sum + value, 0), 161);
const stats = context.calculateTeamStatistics(123, [{ scores: [match], eventComplete: true }]);
assert.equal(stats.avgAutoHiveTips, 2);
assert.equal(stats.avgTeleopHiveTips, 3);
assert.equal(stats.avgTeleopGardenPoints, 8);
assert.equal(stats.avgScore, 151);
assert.equal(stats.swarmRPRate, 100);
assert.equal(stats.pollinator2RPRate, 0);
assert.equal(context.calculateTeamStatistics(123, []).avgAutoHiveTips, 0);
assert.equal(context.getRankingValue({ sortOrder3: 5 }, "hiveTips"), 5);
assert.equal(context.getMatchRankingPoints(blue, red), 3);
assert.equal(context.getMatchRankingPoints(blue, blue), 1);
console.log("BioBuzz score rendering, chart totals, insights and rankings passed");
