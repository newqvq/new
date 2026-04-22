import { WithdrawalStatus } from "@prisma/client";

import { Locale } from "./i18n";

type WithdrawalCopy = {
  user: {
    sectionTitle: string;
    sectionDescription: string;
    amountLabel: string;
    amountPlaceholder: string;
    networkLabel: string;
    addressLabel: string;
    addressPlaceholder: string;
    noteLabel: string;
    notePlaceholder: string;
    reservedHint: string;
    submitAction: string;
    submitPending: string;
    historyTitle: string;
    noRequests: string;
    requestedAtLabel: string;
    reviewedAtLabel: string;
    txHashLabel: string;
    networkValueLabel: string;
    addressValueLabel: string;
    noteValueLabel: string;
    reviewNoteValueLabel: string;
    unavailableForAdmin: string;
  };
  admin: {
    navLabel: string;
    title: string;
    description: string;
    statsPending: string;
    statsApproved: string;
    statsRejected: string;
    userLabel: string;
    amountLabel: string;
    networkLabel: string;
    addressLabel: string;
    txHashLabel: string;
    requestedAtLabel: string;
    reviewedAtLabel: string;
    reviewerLabel: string;
    pendingReviewer: string;
    userNoteLabel: string;
    reviewNoteLabel: string;
    reviewNotePlaceholder: string;
    txHashPlaceholder: string;
    approveAction: string;
    rejectAction: string;
    approvePending: string;
    finishedHint: string;
    noRequests: string;
  };
  statuses: Record<WithdrawalStatus, string>;
  messages: {
    invalidAddress: string;
    invalidTxHash: string;
    amountTooSmall: string;
    amountInsufficient: string;
    addressMatchesPlatform: string;
    requestCreated: (serialNo: string) => string;
    requestMissing: string;
    requestProcessed: string;
    txHashRequired: string;
    requestReviewed: string;
  };
};

const withdrawalCopy: Record<Locale, WithdrawalCopy> = {
  zh: {
    user: {
      sectionTitle: "提现申请",
      sectionDescription: "提交金额、链和收款地址后，系统会先冻结对应余额，等待后台审核与打款。",
      amountLabel: "提现金额",
      amountPlaceholder: "例如 50",
      networkLabel: "所属链",
      addressLabel: "收款地址",
      addressPlaceholder: "填写你的 USDT 收款地址",
      noteLabel: "补充备注",
      notePlaceholder: "例如钱包名称、收款人说明等，可选",
      reservedHint: "提交后会先扣减平台余额；若后台驳回，系统会自动原路退回到平台余额。",
      submitAction: "提交提现申请",
      submitPending: "提交中...",
      historyTitle: "最近提现申请",
      noRequests: "暂无提现申请记录。",
      requestedAtLabel: "申请时间",
      reviewedAtLabel: "审核时间",
      txHashLabel: "打款哈希",
      networkValueLabel: "链",
      addressValueLabel: "地址",
      noteValueLabel: "用户备注",
      reviewNoteValueLabel: "审核备注",
      unavailableForAdmin: "管理员账户不使用前台提现入口，请在后台处理提现单。",
    },
    admin: {
      navLabel: "提现审核",
      title: "提现审核",
      description: "用户提交提现申请时会先冻结余额。后台审核通过后填写打款哈希完成出款；驳回则自动退回余额。",
      statsPending: "待审核",
      statsApproved: "已通过",
      statsRejected: "已驳回",
      userLabel: "用户",
      amountLabel: "提现金额",
      networkLabel: "链",
      addressLabel: "收款地址",
      txHashLabel: "打款哈希",
      requestedAtLabel: "申请时间",
      reviewedAtLabel: "审核时间",
      reviewerLabel: "审核人",
      pendingReviewer: "待审核",
      userNoteLabel: "用户备注",
      reviewNoteLabel: "审核备注",
      reviewNotePlaceholder: "填写审核说明，例如已打款、风控驳回等",
      txHashPlaceholder: "审核通过时填写链上打款哈希",
      approveAction: "审核通过",
      rejectAction: "驳回并退回余额",
      approvePending: "处理中...",
      finishedHint: "该提现单已处理完成，状态和余额结果已锁定。",
      noRequests: "暂无提现申请。",
    },
    statuses: {
      PENDING: "待审核",
      APPROVED: "已通过",
      REJECTED: "已驳回",
    },
    messages: {
      invalidAddress: "请填写有效的收款地址。",
      invalidTxHash: "请填写有效的打款哈希。",
      amountTooSmall: "单笔提现不得低于 1 USDT。",
      amountInsufficient: "可用余额不足，无法提交提现申请。",
      addressMatchesPlatform: "收款地址不能与平台充值地址相同。",
      requestCreated: (serialNo) => `提现申请已提交，等待后台审核。申请单号：${serialNo}`,
      requestMissing: "提现申请不存在。",
      requestProcessed: "该提现申请已处理，不能重复操作。",
      txHashRequired: "审核通过前必须填写打款哈希。",
      requestReviewed: "提现申请已处理。",
    },
  },
  en: {
    user: {
      sectionTitle: "Withdrawal Request",
      sectionDescription: "Submit the amount, network, and payout address. The system will reserve the balance first and wait for admin approval.",
      amountLabel: "Amount",
      amountPlaceholder: "For example 50",
      networkLabel: "Network",
      addressLabel: "Payout Address",
      addressPlaceholder: "Enter your USDT payout address",
      noteLabel: "Note",
      notePlaceholder: "Optional wallet name or extra payout instruction",
      reservedHint: "The platform balance is reserved immediately. If the request is rejected, the amount is credited back automatically.",
      submitAction: "Submit Withdrawal",
      submitPending: "Submitting...",
      historyTitle: "Recent Withdrawals",
      noRequests: "No withdrawal requests yet.",
      requestedAtLabel: "Requested",
      reviewedAtLabel: "Reviewed",
      txHashLabel: "Payout Hash",
      networkValueLabel: "Network",
      addressValueLabel: "Address",
      noteValueLabel: "User Note",
      reviewNoteValueLabel: "Review Note",
      unavailableForAdmin: "Admin accounts should manage withdrawals in the back office instead of the user-facing page.",
    },
    admin: {
      navLabel: "Withdrawals",
      title: "Withdrawal Reviews",
      description: "User balances are reserved when a withdrawal request is created. Approving a request should include the payout hash; rejecting it returns the balance automatically.",
      statsPending: "Pending",
      statsApproved: "Approved",
      statsRejected: "Rejected",
      userLabel: "User",
      amountLabel: "Amount",
      networkLabel: "Network",
      addressLabel: "Address",
      txHashLabel: "Payout Hash",
      requestedAtLabel: "Requested",
      reviewedAtLabel: "Reviewed",
      reviewerLabel: "Reviewer",
      pendingReviewer: "Pending",
      userNoteLabel: "User Note",
      reviewNoteLabel: "Review Note",
      reviewNotePlaceholder: "For example: paid on-chain, rejected by risk control",
      txHashPlaceholder: "Required when approving a withdrawal",
      approveAction: "Approve",
      rejectAction: "Reject and Refund",
      approvePending: "Processing...",
      finishedHint: "This withdrawal request is already finalized.",
      noRequests: "No withdrawal requests.",
    },
    statuses: {
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
    },
    messages: {
      invalidAddress: "Enter a valid payout address.",
      invalidTxHash: "Enter a valid payout transaction hash.",
      amountTooSmall: "A withdrawal must be at least 1 USDT.",
      amountInsufficient: "Insufficient available balance for this withdrawal.",
      addressMatchesPlatform: "The payout address cannot match the platform deposit address.",
      requestCreated: (serialNo) => `Withdrawal request submitted. Waiting for admin review. Request: ${serialNo}`,
      requestMissing: "Withdrawal request not found.",
      requestProcessed: "This withdrawal request has already been processed.",
      txHashRequired: "A payout hash is required before approval.",
      requestReviewed: "Withdrawal request updated.",
    },
  },
  ko: {
    user: {
      sectionTitle: "출금 신청",
      sectionDescription: "금액, 체인, 수령 주소를 제출하면 잔액을 먼저 보류하고 관리자 승인 후 출금 처리합니다.",
      amountLabel: "출금 금액",
      amountPlaceholder: "예: 50",
      networkLabel: "체인",
      addressLabel: "수령 주소",
      addressPlaceholder: "USDT 수령 주소를 입력하세요",
      noteLabel: "추가 메모",
      notePlaceholder: "지갑 이름이나 수령 설명 등 선택 입력",
      reservedHint: "신청 즉시 플랫폼 잔액이 먼저 차감됩니다. 거절되면 자동으로 플랫폼 잔액으로 복구됩니다.",
      submitAction: "출금 신청",
      submitPending: "제출 중...",
      historyTitle: "최근 출금 신청",
      noRequests: "출금 신청 기록이 없습니다.",
      requestedAtLabel: "신청 시간",
      reviewedAtLabel: "검토 시간",
      txHashLabel: "출금 해시",
      networkValueLabel: "체인",
      addressValueLabel: "주소",
      noteValueLabel: "사용자 메모",
      reviewNoteValueLabel: "검토 메모",
      unavailableForAdmin: "관리자 계정은 사용자용 출금 페이지 대신 백오피스에서 처리해야 합니다.",
    },
    admin: {
      navLabel: "출금 심사",
      title: "출금 심사",
      description: "사용자가 출금 신청을 제출하면 잔액이 먼저 보류됩니다. 승인 시 출금 해시를 기록하고, 거절 시 잔액을 자동으로 되돌립니다.",
      statsPending: "대기",
      statsApproved: "승인",
      statsRejected: "거절",
      userLabel: "사용자",
      amountLabel: "금액",
      networkLabel: "체인",
      addressLabel: "수령 주소",
      txHashLabel: "출금 해시",
      requestedAtLabel: "신청 시간",
      reviewedAtLabel: "검토 시간",
      reviewerLabel: "검토자",
      pendingReviewer: "대기",
      userNoteLabel: "사용자 메모",
      reviewNoteLabel: "검토 메모",
      reviewNotePlaceholder: "예: 온체인 송금 완료, 리스크 사유로 거절",
      txHashPlaceholder: "승인 시 출금 해시를 입력하세요",
      approveAction: "승인",
      rejectAction: "거절 후 잔액 반환",
      approvePending: "처리 중...",
      finishedHint: "이 출금 신청은 이미 처리 완료되었습니다.",
      noRequests: "출금 신청이 없습니다.",
    },
    statuses: {
      PENDING: "대기",
      APPROVED: "승인",
      REJECTED: "거절",
    },
    messages: {
      invalidAddress: "유효한 수령 주소를 입력하세요.",
      invalidTxHash: "유효한 출금 해시를 입력하세요.",
      amountTooSmall: "출금 금액은 최소 1 USDT여야 합니다.",
      amountInsufficient: "출금 가능한 잔액이 부족합니다.",
      addressMatchesPlatform: "수령 주소는 플랫폼 충전 주소와 같을 수 없습니다.",
      requestCreated: (serialNo) => `출금 신청이 접수되었습니다. 관리자 검토를 기다리세요. 신청번호: ${serialNo}`,
      requestMissing: "출금 신청을 찾을 수 없습니다.",
      requestProcessed: "이 출금 신청은 이미 처리되었습니다.",
      txHashRequired: "승인 전에 출금 해시를 입력해야 합니다.",
      requestReviewed: "출금 신청이 처리되었습니다.",
    },
  },
};

export function getWithdrawalCopy(locale: Locale) {
  return withdrawalCopy[locale];
}
