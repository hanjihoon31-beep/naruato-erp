// server/utils/mailer.js
const nodemailer = require("nodemailer"); // 최상단

// Gmail (앱 비밀번호) 사용
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/** 공통 메일 발송 */
async function sendMail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"NARUATO ERP SYSTEM" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📨 메일 발송 완료 → ${to}`);
    return true;
  } catch (err) {
    console.error("❌ 메일 발송 오류:", err);
    return false;
  }
}

/** 임시 비밀번호 */
async function sendTemporaryPasswordMail(to, tempPassword) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color:#2C3E50;">[NARUATO ERP SYSTEM] 임시 비밀번호 안내</h2>
      <p>요청하신 임시 비밀번호는 아래와 같습니다.</p>
      <div style="margin:20px 0; padding:15px; background:#f4f4f4; border-radius:8px; font-size:18px; text-align:center;">
        <b style="font-size:22px; color:#E74C3C;">${tempPassword}</b>
      </div>
      <p>로그인 후 반드시 비밀번호를 변경해주세요.</p>
      <p style="color:#7F8C8D; font-size:12px; margin-top:25px;">본 메일은 자동 발송되었습니다.</p>
    </div>
  `;
  return sendMail(to, "🔐 NARUATO ERP - 임시 비밀번호 발급", html);
}

/** 가입 승인 */
async function sendApprovalMail(to, name) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color:#27AE60;">✅ 회원가입 승인 완료</h2>
      <p>${name}님, 환영합니다! 관리자 승인 완료되어 로그인하실 수 있습니다.</p>
      <p style="margin-top:16px;">👉 <b>NARUATO ERP SYSTEM 접속 후 로그인해주세요.</b></p>
      <p style="color:#7F8C8D; font-size:12px; margin-top:25px;">본 메일은 자동 발송되었습니다.</p>
    </div>
  `;
  return sendMail(to, "🎉 NARUATO ERP - 회원가입 승인 안내", html);
}

/** 가입 거절 */
async function sendRejectMail(to, name, reason) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color:#E74C3C;">❌ 회원가입 거절 안내</h2>
      <p>${name}님, 아래 사유로 가입이 거절되었습니다.</p>
      <div style="margin:16px 0; padding:12px; background:#fff1f0; border:1px solid #ffccc7; border-radius:8px;">
        <b>사유: </b>${reason || "관리자 거절"}
      </div>
      <p>재신청 또는 담당자에게 문의 바랍니다.</p>
      <p style="color:#7F8C8D; font-size:12px; margin-top:25px;">본 메일은 자동 발송되었습니다.</p>
    </div>
  `;
  return sendMail(to, "📩 NARUATO ERP - 회원가입 거절 안내", html);
}

module.exports = {
  sendMail,
  sendTemporaryPasswordMail,
  sendApprovalMail,
  sendRejectMail,
};
