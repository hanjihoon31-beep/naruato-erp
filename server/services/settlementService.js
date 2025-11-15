// server/services/settlementService.js
const mongoose = require("mongoose");
const DailyBook = require("../models/DailyBook");
const DailySettlement = require("../models/DailySettlement");

async function approveDailySettlement({ bookId, approverId, totals }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const book = await DailyBook.findById(bookId).session(session);
    if (!book) throw new Error("일일 장부를 찾을 수 없습니다.");
    if (book.status === "approved") {
      throw new Error("이미 결산 확정된 장부입니다.");
    }

    book.status = "approved";
    book.submittedAt = book.submittedAt || new Date();
    await book.save({ session });

    const settlement = await DailySettlement.create(
      [
        {
          store: book.store,
          book: book._id,
          date: book.date,
          snapshot: {
            sales: book.sales,
            attendance: book.attendance,
            inventory: book.inventory,
            notes: book.notes,
            submittedAt: book.submittedAt,
            createdBy: book.createdBy,
          },
          totals,
          approvedBy: approverId,
          journalNumber: `DSL-${book.date.getFullYear()}${String(book.date.getMonth() + 1).padStart(2, "0")}-${book._id
            .toString()
            .slice(-6)}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return settlement[0];
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = {
  approveDailySettlement,
};
