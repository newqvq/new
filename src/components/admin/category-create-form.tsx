"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { AlertBanner } from "@/components/alert-banner";
import { SubmitButton } from "@/components/submit-button";
import { upsertProductCategoryAction } from "@/lib/actions/admin";

type ProductCategoryActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialCategoryActionState: ProductCategoryActionState = {
  status: "idle",
  message: "",
};

type CategoryCreateFormProps = {
  copy: {
    categoryName: string;
    categorySort: string;
    categoryCreate: string;
    categoryCreatePending: string;
  };
};

export function CategoryCreateForm({ copy }: CategoryCreateFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<ProductCategoryActionState, FormData>(
    upsertProductCategoryAction,
    initialCategoryActionState,
  );

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    formRef.current?.reset();
    const sortInput = formRef.current?.elements.namedItem("sortOrder");
    if (sortInput instanceof HTMLInputElement) {
      sortInput.value = "100";
    }
    router.refresh();
  }, [router, state.status]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-3">
      {state.status !== "idle" ? (
        <AlertBanner kind={state.status} message={state.message} />
      ) : null}

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {copy.categoryName}
        </label>
        <input
          name="name"
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {copy.categorySort}
        </label>
        <input
          name="sortOrder"
          defaultValue="100"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
        />
      </div>
      <SubmitButton
        pendingText={copy.categoryCreatePending}
        className="w-full justify-center"
      >
        {copy.categoryCreate}
      </SubmitButton>
    </form>
  );
}
