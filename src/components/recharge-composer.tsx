"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { createRechargeOrderAction } from "@/lib/actions/shop";
import { cn } from "@/lib/utils";

import { CopyButton } from "./copy-button";
import { SubmitButton } from "./submit-button";

type NetworkOption = {
  value: string;
  label: string;
  chainLabel: string;
  note: string;
  address: string;
  minConfirmations: number;
  recommended: boolean;
  autoVerifyReady: boolean;
};

type RechargeComposerProps = {
  balanceLabel: string;
  networks: NetworkOption[];
  copy: {
    balanceLabel: string;
    balanceHint: string;
    steps: ReadonlyArray<{ title: string; body: string }>;
    amountLabel: string;
    amountPlaceholder: string;
    networkLabel: string;
    recommended: string;
    pendingEnable: string;
    networkUnavailable: string;
    currentAddress: string;
    addressTips: ReadonlyArray<string>;
    createOrder: string;
    depositQr: string;
    qrAltSuffix: string;
    generatingQr: string;
    scanHint: string;
    paymentNotice: string;
    paymentTips: ReadonlyArray<string>;
    copyAddress: string;
    copied: string;
    processing: string;
  };
};

const amountPresets = ["10", "20", "50", "100", "200"];

export function RechargeComposer({
  balanceLabel,
  networks,
  copy,
}: RechargeComposerProps) {
  const [amount, setAmount] = useState("50");
  const [selectedNetwork, setSelectedNetwork] = useState(networks[0]?.value ?? "");
  const [qrCode, setQrCode] = useState("");

  const currentNetwork =
    networks.find((network) => network.value === selectedNetwork) ?? networks[0];

  useEffect(() => {
    let active = true;

    async function generate() {
      if (!currentNetwork?.address) {
        setQrCode("");
        return;
      }

      const dataUrl = await QRCode.toDataURL(currentNetwork.address, {
        margin: 1,
        width: 220,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });

      if (active) {
        setQrCode(dataUrl);
      }
    }

    generate();

    return () => {
      active = false;
    };
  }, [currentNetwork?.address]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">{copy.balanceLabel}</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{balanceLabel}</div>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
            {copy.balanceHint}
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {copy.steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Step {index + 1}
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{step.title}</div>
              <div className="mt-1 text-sm text-slate-500">{step.body}</div>
            </div>
          ))}
        </div>

        <form action={createRechargeOrderAction} className="mt-8 space-y-6">
          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-700">
              {copy.amountLabel}
            </label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                type="text"
                name="amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={copy.amountPlaceholder}
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-slate-950"
              />
              <div className="flex flex-wrap gap-2">
                {amountPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-semibold transition",
                      amount === preset
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-sky-500 hover:text-sky-700",
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-700">
              {copy.networkLabel}
            </label>
            <input type="hidden" name="network" value={currentNetwork.value} />
            <div className="grid gap-3 lg:grid-cols-3">
              {networks.map((network) => (
                  <button
                    key={network.value}
                    type="button"
                    disabled={!network.autoVerifyReady}
                    onClick={() => setSelectedNetwork(network.value)}
                    className={cn(
                      "rounded-[26px] border p-4 text-left transition",
                      !network.autoVerifyReady &&
                        "cursor-not-allowed border-dashed border-slate-200 bg-slate-100 text-slate-400 opacity-70",
                      network.value === currentNetwork.value
                        ? "border-sky-600 bg-sky-50 text-sky-800 shadow-[0_16px_35px_rgba(59,130,246,0.12)]"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-500",
                      !network.autoVerifyReady &&
                        network.value !== currentNetwork.value &&
                        "hover:border-slate-200",
                    )}
                  >
                  <div className="flex items-center justify-between">
                    <div className="text-base font-black">{network.label}</div>
                    {network.recommended ? (
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {copy.recommended}
                      </div>
                    ) : null}
                    {!network.autoVerifyReady ? (
                      <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                        {copy.pendingEnable}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-2 text-sm opacity-80">{network.chainLabel}</div>
                  <div className="mt-3 text-sm leading-6 opacity-85">{network.note}</div>
                  {!network.autoVerifyReady ? (
                    <div className="mt-3 text-xs font-semibold opacity-90">
                      {copy.networkUnavailable}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-500">{copy.currentAddress}</div>
                <div className="mt-2 break-all text-base font-black text-slate-950">
                  {currentNetwork.address}
                </div>
              </div>
              <CopyButton
                text={currentNetwork.address}
                idleLabel={copy.copyAddress}
                copiedLabel={copy.copied}
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                {copy.addressTips[0]}
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                {copy.addressTips[1].replace("{count}", String(currentNetwork.minConfirmations))}
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                {currentNetwork.autoVerifyReady
                  ? copy.addressTips[2]
                  : copy.addressTips[3]}
              </div>
            </div>
          </div>

          <SubmitButton pendingText={copy.processing} className="w-full justify-center py-3 text-base">
            {copy.createOrder}
          </SubmitButton>
        </form>
      </section>

      <section className="panel p-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-slate-400">
                {copy.depositQr}
              </div>
              <div className="mt-2 text-2xl font-black text-slate-950">{currentNetwork.label}</div>
            </div>
            <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              USDT
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-slate-950">
            {qrCode ? (
              <Image
                src={qrCode}
                alt={`${currentNetwork.label} ${copy.qrAltSuffix}`}
                className="h-[220px] w-[220px] rounded-2xl"
                width={220}
                height={220}
                unoptimized
              />
            ) : (
              <div className="flex h-[220px] w-[220px] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400">
                {copy.generatingQr}
              </div>
            )}
            <div className="mt-4 text-xs text-slate-500">{copy.scanHint}</div>
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-700">{copy.paymentNotice}</div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {copy.paymentTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
