import {
  OrderDeliveryType,
  OrderStatus,
  UpstreamSubmissionStatus,
} from "@prisma/client";
import { CheckCircle2, Circle, Clock3, RotateCcw, XCircle } from "lucide-react";

import { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type StepState = "completed" | "current" | "upcoming" | "cancelled";

type ProgressStep = {
  title: string;
  description: string;
  state: StepState;
};

function getCopy(locale: Locale) {
  return {
    zh: {
      created: "订单已创建",
      createdDesc: "系统已扣除平台余额并生成订单。",
      manualQueue: "进入人工队列",
      manualQueueDesc: "订单正在等待人工接单处理。",
      manualProcessing: "人工处理中",
      manualProcessingDesc: "后台正在核对库存、账号或交付条件。",
      submitted: "已提交上游",
      submittedDesc: "系统已将订单推送到上游面板，等待返回执行状态。",
      reviewPending: "待人工核实",
      reviewPendingDesc: "上游提交结果暂不明确，后台需要核对是否成功接单。",
      upstreamProcessing: "上游处理中",
      upstreamProcessingDesc: "系统会持续拉取上游状态并回写到当前订单。",
      completed: "交付完成",
      completedDesc: "订单已处理完成，结果会展示在备注或售后说明中。",
      refunded: "已退款",
      refundedDesc: "订单金额已退回平台余额。",
      cancelled: "已取消",
      cancelledDesc: "订单已终止，不会继续履约。",
      submitFailed: "提交失败",
      submitFailedDesc: "上游下单失败，系统已回退到人工核对或退款流程。",
      statusPending: "待处理",
      statusPendingDesc: "订单已创建，等待进一步处理。",
      statusProcessing: "处理中",
      statusProcessingDesc: "订单正在处理流程中。",
      statusFulfilled: "已完成",
      statusFulfilledDesc: "订单已完成交付。",
      statusRefunded: "已退款",
      statusRefundedDesc: "订单金额已退回。",
      statusCancelled: "已取消",
      statusCancelledDesc: "订单已取消。",
      statusUnknown: "未知状态",
    },
    en: {
      created: "Order Created",
      createdDesc: "The platform balance was deducted and the order was recorded.",
      manualQueue: "Queued for Manual Handling",
      manualQueueDesc: "The order is waiting for a staff member to pick it up.",
      manualProcessing: "Manual Processing",
      manualProcessingDesc: "The back office is checking stock, accounts, or delivery conditions.",
      submitted: "Submitted Upstream",
      submittedDesc: "The order has been pushed to the upstream panel and is awaiting execution status.",
      reviewPending: "Needs Manual Review",
      reviewPendingDesc: "The upstream submission result is uncertain and requires verification.",
      upstreamProcessing: "Upstream Processing",
      upstreamProcessingDesc: "The system keeps syncing the upstream status back into this order.",
      completed: "Completed",
      completedDesc: "The order is complete and the result should appear in the notes.",
      refunded: "Refunded",
      refundedDesc: "The order amount was returned to the platform balance.",
      cancelled: "Cancelled",
      cancelledDesc: "The order was terminated and will not continue.",
      submitFailed: "Submission Failed",
      submitFailedDesc: "The upstream submission failed and the order moved into refund or review flow.",
      statusPending: "Pending",
      statusPendingDesc: "The order is waiting for the next handling step.",
      statusProcessing: "Processing",
      statusProcessingDesc: "The order is moving through the handling flow.",
      statusFulfilled: "Completed",
      statusFulfilledDesc: "The order has been fulfilled.",
      statusRefunded: "Refunded",
      statusRefundedDesc: "The order amount was returned.",
      statusCancelled: "Cancelled",
      statusCancelledDesc: "The order was cancelled.",
      statusUnknown: "Unknown status",
    },
    ko: {
      created: "주문 생성 완료",
      createdDesc: "플랫폼 잔액이 차감되고 주문이 생성되었습니다.",
      manualQueue: "수동 처리 대기",
      manualQueueDesc: "운영자가 주문을 접수하기를 기다리고 있습니다.",
      manualProcessing: "수동 처리 중",
      manualProcessingDesc: "관리자가 재고, 계정 또는 전달 조건을 확인하고 있습니다.",
      submitted: "상위 패널 제출 완료",
      submittedDesc: "주문이 상위 패널로 전송되었고 실행 상태를 기다리고 있습니다.",
      reviewPending: "수동 확인 대기",
      reviewPendingDesc: "상위 제출 결과가 불확실하여 관리자의 확인이 필요합니다.",
      upstreamProcessing: "상위 처리 중",
      upstreamProcessingDesc: "시스템이 상위 상태를 계속 동기화합니다.",
      completed: "처리 완료",
      completedDesc: "주문이 완료되었고 결과가 메모에 표시됩니다.",
      refunded: "환불 완료",
      refundedDesc: "주문 금액이 플랫폼 잔액으로 반환되었습니다.",
      cancelled: "취소됨",
      cancelledDesc: "주문이 종료되어 더 이상 진행되지 않습니다.",
      submitFailed: "제출 실패",
      submitFailedDesc: "상위 주문 제출이 실패해 환불 또는 수동 확인 흐름으로 전환되었습니다.",
      statusPending: "대기 중",
      statusPendingDesc: "다음 처리 단계를 기다리고 있습니다.",
      statusProcessing: "처리 중",
      statusProcessingDesc: "주문이 처리 흐름 안에 있습니다.",
      statusFulfilled: "완료",
      statusFulfilledDesc: "주문이 완료되었습니다.",
      statusRefunded: "환불됨",
      statusRefundedDesc: "주문 금액이 반환되었습니다.",
      statusCancelled: "취소됨",
      statusCancelledDesc: "주문이 취소되었습니다.",
      statusUnknown: "알 수 없는 상태",
    },
  }[locale];
}

function getProgressSteps(
  status: OrderStatus,
  locale: Locale,
  deliveryType: OrderDeliveryType = OrderDeliveryType.MANUAL,
  submissionStatus: UpstreamSubmissionStatus = UpstreamSubmissionStatus.NOT_REQUIRED,
) {
  const copy = getCopy(locale);

  if (status === OrderStatus.REFUNDED) {
    return [
      { title: copy.created, description: copy.createdDesc, state: "completed" },
      {
        title: deliveryType === OrderDeliveryType.CRAZYSMM ? copy.submitted : copy.manualQueue,
        description:
          deliveryType === OrderDeliveryType.CRAZYSMM
            ? copy.submittedDesc
            : copy.manualQueueDesc,
        state: "completed",
      },
      { title: copy.refunded, description: copy.refundedDesc, state: "cancelled" },
    ] satisfies ProgressStep[];
  }

  if (status === OrderStatus.CANCELLED) {
    return [
      { title: copy.created, description: copy.createdDesc, state: "completed" },
      { title: copy.cancelled, description: copy.cancelledDesc, state: "cancelled" },
    ] satisfies ProgressStep[];
  }

  if (deliveryType === OrderDeliveryType.CRAZYSMM) {
    const submitState: StepState =
      submissionStatus === UpstreamSubmissionStatus.SUBMITTED
        ? "completed"
        : submissionStatus === UpstreamSubmissionStatus.UNKNOWN ||
            submissionStatus === UpstreamSubmissionStatus.PENDING
          ? "current"
          : submissionStatus === UpstreamSubmissionStatus.FAILED
            ? "cancelled"
            : "upcoming";

    const processState: StepState =
      status === OrderStatus.FULFILLED
        ? "completed"
        : status === OrderStatus.PROCESSING || submitState === "completed"
          ? "current"
          : "upcoming";

    return [
      { title: copy.created, description: copy.createdDesc, state: "completed" },
      {
        title:
          submissionStatus === UpstreamSubmissionStatus.FAILED
            ? copy.submitFailed
            : submissionStatus === UpstreamSubmissionStatus.UNKNOWN
              ? copy.reviewPending
              : copy.submitted,
        description:
          submissionStatus === UpstreamSubmissionStatus.FAILED
            ? copy.submitFailedDesc
            : submissionStatus === UpstreamSubmissionStatus.UNKNOWN
              ? copy.reviewPendingDesc
              : copy.submittedDesc,
        state: submitState,
      },
      {
        title: copy.upstreamProcessing,
        description: copy.upstreamProcessingDesc,
        state: processState,
      },
      {
        title: copy.completed,
        description: copy.completedDesc,
        state: status === OrderStatus.FULFILLED ? "completed" : "upcoming",
      },
    ] satisfies ProgressStep[];
  }

  return [
    { title: copy.created, description: copy.createdDesc, state: "completed" },
    {
      title: copy.manualQueue,
      description: copy.manualQueueDesc,
      state:
        status === OrderStatus.PENDING
          ? "current"
          : status === OrderStatus.PROCESSING || status === OrderStatus.FULFILLED
            ? "completed"
            : "upcoming",
    },
    {
      title: copy.manualProcessing,
      description: copy.manualProcessingDesc,
      state:
        status === OrderStatus.PROCESSING
          ? "current"
          : status === OrderStatus.FULFILLED
            ? "completed"
            : "upcoming",
    },
    {
      title: copy.completed,
      description: copy.completedDesc,
      state: status === OrderStatus.FULFILLED ? "completed" : "upcoming",
    },
  ] satisfies ProgressStep[];
}

export function getOrderStatusMeta(
  status: OrderStatus,
  locale: Locale,
  deliveryType: OrderDeliveryType = OrderDeliveryType.MANUAL,
  submissionStatus: UpstreamSubmissionStatus = UpstreamSubmissionStatus.NOT_REQUIRED,
) {
  const copy = getCopy(locale);

  if (
    deliveryType === OrderDeliveryType.CRAZYSMM &&
    submissionStatus === UpstreamSubmissionStatus.UNKNOWN
  ) {
    return {
      label: copy.reviewPending,
      summary: copy.reviewPendingDesc,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (
    deliveryType === OrderDeliveryType.CRAZYSMM &&
    submissionStatus === UpstreamSubmissionStatus.FAILED
  ) {
    return {
      label: copy.submitFailed,
      summary: copy.submitFailedDesc,
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  switch (status) {
    case OrderStatus.PENDING:
      return {
        label: copy.statusPending,
        summary: copy.statusPendingDesc,
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case OrderStatus.PROCESSING:
      return {
        label: copy.statusProcessing,
        summary: copy.statusProcessingDesc,
        className: "border-sky-200 bg-sky-50 text-sky-700",
      };
    case OrderStatus.FULFILLED:
      return {
        label: copy.statusFulfilled,
        summary: copy.statusFulfilledDesc,
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case OrderStatus.REFUNDED:
      return {
        label: copy.statusRefunded,
        summary: copy.statusRefundedDesc,
        className: "border-violet-200 bg-violet-50 text-violet-700",
      };
    case OrderStatus.CANCELLED:
      return {
        label: copy.statusCancelled,
        summary: copy.statusCancelledDesc,
        className: "border-rose-200 bg-rose-50 text-rose-700",
      };
    default:
      return {
        label: status,
        summary: copy.statusUnknown,
        className: "border-slate-200 bg-slate-100 text-slate-700",
      };
  }
}

export function OrderProgress({
  status,
  locale,
  deliveryType = OrderDeliveryType.MANUAL,
  submissionStatus = UpstreamSubmissionStatus.NOT_REQUIRED,
}: {
  status: OrderStatus;
  locale: Locale;
  deliveryType?: OrderDeliveryType;
  submissionStatus?: UpstreamSubmissionStatus;
}) {
  const steps = getProgressSteps(status, locale, deliveryType, submissionStatus);

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => {
        const isCancelled = step.state === "cancelled";
        const isCompleted = step.state === "completed";
        const isCurrent = step.state === "current";

        return (
          <div key={`${step.title}-${index}`} className="relative">
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "absolute left-[calc(100%-6px)] top-5 hidden h-[2px] w-[calc(100%+18px)] md:block",
                  isCompleted && "bg-emerald-200",
                  isCurrent && "bg-sky-200",
                  isCancelled && status === OrderStatus.REFUNDED && "bg-violet-200",
                  isCancelled && status !== OrderStatus.REFUNDED && "bg-rose-200",
                  step.state === "upcoming" && "bg-slate-200",
                )}
              />
            ) : null}
            <div
              className={cn(
                "relative rounded-[24px] border px-4 py-4",
                isCompleted && "border-emerald-200 bg-emerald-50",
                isCurrent && "border-sky-200 bg-sky-50",
                isCancelled && status === OrderStatus.REFUNDED && "border-violet-200 bg-violet-50",
                isCancelled && status !== OrderStatus.REFUNDED && "border-rose-200 bg-rose-50",
                step.state === "upcoming" && "border-slate-200 bg-white",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black",
                    isCompleted && "border-emerald-200 bg-white text-emerald-600",
                    isCurrent && "border-sky-200 bg-white text-sky-600",
                    isCancelled && status === OrderStatus.REFUNDED && "border-violet-200 bg-white text-violet-600",
                    isCancelled && status !== OrderStatus.REFUNDED && "border-rose-200 bg-white text-rose-600",
                    step.state === "upcoming" && "border-slate-200 bg-white text-slate-400",
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : null}
                  {isCurrent ? <Clock3 className="h-5 w-5" /> : null}
                  {isCancelled && status === OrderStatus.REFUNDED ? (
                    <RotateCcw className="h-5 w-5" />
                  ) : null}
                  {isCancelled && status !== OrderStatus.REFUNDED ? (
                    <XCircle className="h-5 w-5" />
                  ) : null}
                  {step.state === "upcoming" ? <Circle className="h-5 w-5" /> : null}
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    STEP {index + 1}
                  </div>
                  <div className="text-sm font-black text-slate-950">{step.title}</div>
                </div>
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-600">{step.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
