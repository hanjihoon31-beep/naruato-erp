// server/services/vocService.js
const dayjs = require("dayjs");
const VOC = require("../models/VOC");

async function getVocStats({ storeId, year, month, compare = false }) {
  const periodStart = dayjs().year(year).month(month - 1).startOf("month").toDate();
  const periodEnd = dayjs().year(year).month(month - 1).endOf("month").toDate();
  const prevStart = dayjs(periodStart).subtract(1, "year").toDate();
  const prevEnd = dayjs(periodEnd).subtract(1, "year").toDate();

  const match = { occurredAt: { $gte: periodStart, $lte: periodEnd } };
  if (storeId) match.store = storeId;

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ];
  const current = await VOC.aggregate(pipeline);

  const response = {
    HUMAN: 0,
    SYSTEM: 0,
    POSITIVE: 0,
  };
  current.forEach((item) => {
    response[item._id] = item.count;
  });

  if (!compare) {
    return { stats: response };
  }

  const prevMatch = { occurredAt: { $gte: prevStart, $lte: prevEnd } };
  if (storeId) prevMatch.store = storeId;
  const prev = await VOC.aggregate([
    { $match: prevMatch },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);
  const prevMap = { HUMAN: 0, SYSTEM: 0, POSITIVE: 0 };
  prev.forEach((item) => (prevMap[item._id] = item.count));

  const diff = {};
  Object.keys(response).forEach((key) => {
    const base = prevMap[key] || 0.0001;
    diff[key] = Number((((response[key] - prevMap[key]) / base) * 100).toFixed(1));
  });

  if (compare) {
    const totalPipeline = [
      { $match: { occurredAt: { $gte: periodStart, $lte: periodEnd } } },
      { $group: { _id: "$store", counts: { $push: "$type" }, total: { $sum: 1 } } },
      {
        $project: {
          HUMAN: {
            $size: {
              $filter: { input: "$counts", as: "type", cond: { $eq: ["$$type", "HUMAN"] } },
            },
          },
          SYSTEM: {
            $size: {
              $filter: { input: "$counts", as: "type", cond: { $eq: ["$$type", "SYSTEM"] } },
            },
          },
          POSITIVE: {
            $size: {
              $filter: { input: "$counts", as: "type", cond: { $eq: ["$$type", "POSITIVE"] } },
            },
          },
        },
      },
    ];
    const allStores = await VOC.aggregate(totalPipeline);

    return { stats: response, yoy: diff, compare: allStores };
  }

  return { stats: response, yoy: diff };
}

module.exports = {
  getVocStats,
};
