"use client";

import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

const SITE_URL = "https://golf-winter-league.vercel.app/";

export default function PrintoutsPage() {
  return (
    <div>
      <div className="no-print">
        <Link
          href="/"
          className="text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          Dashboard
        </Link>
        <div className="flex items-baseline justify-between">
          <h1 className="mt-1 font-serif text-[32px] italic text-neutral-900">
            QR Code
          </h1>
          <button
            onClick={() => window.print()}
            className="text-[13px] text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            Print
          </button>
        </div>
        <p className="mt-0.5 text-[13px] text-neutral-500">
          Print QR codes for players to scan and view standings on their phones.
        </p>
      </div>

      {/* Printable QR code card — 2 copies per page */}
      <div className="qr-print-area mt-10 flex flex-col items-center gap-16">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="qr-card flex flex-col items-center border border-neutral-200 rounded-lg px-10 py-8"
          >
            <Image src="/logo.png" alt="RBGC" width={48} height={56} />
            <h2 className="mt-3 font-serif text-[22px] italic text-neutral-900">
              Golf Winter League
            </h2>
            <p className="mt-1 text-[13px] text-neutral-500">
              Scan to view live standings &amp; scores
            </p>
            <div className="mt-6">
              <QRCodeSVG
                value={SITE_URL}
                size={200}
                level="M"
                marginSize={0}
              />
            </div>
            <p className="mt-4 text-[12px] text-neutral-400 tracking-wide">
              {SITE_URL.replace(/^https?:\/\//, "")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
