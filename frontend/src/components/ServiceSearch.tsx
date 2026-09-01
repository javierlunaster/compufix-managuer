import { useState } from "react";
import { api } from "@/lib/api";
import type { Service } from "@/lib/types";
import { Input } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

export function ServiceSearch({ onSelect }: { onSelect: (service: Service) => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Service[]>([]);

  async function search(value: string) {
    setTerm(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    const services = await api.get<Service[]>("/services", { search: value });
    setResults(services);
  }

  return (
    <div className="relative">
      <Input value={term} onChange={(e) => search(e.target.value)} placeholder="Buscar servicio…" />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded border border-border bg-surface-raised shadow-lg">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg"
                onClick={() => {
                  onSelect(s);
                  setTerm("");
                  setResults([]);
                }}
              >
                <span className="text-ink">{s.name}</span>
                <span className="tabular text-xs text-ink-muted">{formatCurrency(s.basePrice)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
