"use client";

import { useState } from "react";
import Image from "next/image";

interface MarketplaceProduct {
  title: string;
  url: string;
  image: string;
  marketplace: string;
  icon: string;
  price?: number | null;
}

interface MarketplacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  products: MarketplaceProduct[];
  isLoading: boolean;
  error: string | null;
}

const MARKETPLACE_TABS = ["Все", "Wildberries", "Ozon", "Яндекс Маркет", "Lamoda", "AliExpress", "Quelle", "Otto"];

export function MarketplacePanel({ isOpen, onClose, products, isLoading, error }: MarketplacePanelProps) {
  const [activeTab, setActiveTab] = useState("Все");

  const filtered = activeTab === "Все"
    ? products
    : products.filter((p) => p.marketplace === activeTab);

  // Определяем какие табы показывать (только те, где есть товары + "Все")
  const availableTabs = MARKETPLACE_TABS.filter(
    (tab) => tab === "Все" || products.some((p) => p.marketplace === tab)
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:bg-transparent"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-background/95 backdrop-blur-md border-l border-foreground/10 z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-foreground/10">
          <h2 className="text-foreground font-bold text-lg">Похожие товары</h2>
          <button
            onClick={onClose}
            className="text-foreground/60 hover:text-foreground transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        {!isLoading && !error && products.length > 0 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-foreground/10">
            {availableTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-gold text-black"
                    : "bg-foreground/10 text-foreground/60 hover:bg-foreground/20"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-60px)] px-4 py-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-card rounded-lg p-3 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-20 h-20 bg-foreground/10 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-foreground/10 rounded w-3/4" />
                      <div className="h-3 bg-foreground/10 rounded w-1/2" />
                      <div className="h-6 bg-foreground/10 rounded w-24 mt-2" />
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-foreground/40 text-sm text-center mt-4">
                Ищем похожие товары...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-3">😔</div>
              <p className="text-foreground/60 text-sm">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-lg text-sm transition-colors"
              >
                Закрыть
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-3">🔍</div>
              <p className="text-foreground/60 text-sm">
                {products.length === 0
                  ? "Похожие товары не найдены на маркетплейсах"
                  : "Нет товаров в этой категории"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((product, index) => (
                <a
                  key={index}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block glass-card rounded-lg p-3 hover:bg-muted transition-colors group"
                >
                  <div className="flex gap-3">
                    {/* Product image */}
                    <div className="w-20 h-20 bg-foreground/5 rounded-lg flex-shrink-0 overflow-hidden relative">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🛍️
                        </div>
                      )}
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm line-clamp-2 group-hover:text-gold transition-colors">
                        {product.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-xs">{product.icon}</span>
                        <span className="text-foreground/50 text-xs">{product.marketplace}</span>
                      </div>
                      {product.price ? (
                        <span className="inline-block mt-1 text-gold text-sm font-bold">
                          {product.price.toLocaleString("ru-RU")} ₽
                        </span>
                      ) : (
                        <span className="inline-block mt-2 text-gold text-xs font-medium group-hover:underline">
                          Перейти →
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}

              <p className="text-foreground/30 text-xs text-center mt-4">
                Найдено {products.length} товаров
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
