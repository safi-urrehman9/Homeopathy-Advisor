"use client";

import { useMutation } from "@tanstack/react-query";
import { BookOpen, Loader2, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { showError } from "@/hooks/use-toast-error";
import { api } from "@/lib/api/endpoints";

export function MateriaMedicaPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState("");

  const searchMutation = useMutation({
    mutationFn: api.searchMateriaMedica,
    onSuccess: (response, searchQuery) => {
      setResult(response.text);
      window.history.replaceState(null, "", `/materia-medica?q=${encodeURIComponent(searchQuery)}`);
    },
    onError: (error) => {
      showError(error, "An error occurred while searching the Materia Medica.");
      setResult("An error occurred while searching the Materia Medica. Please try again.");
    },
  });

  useEffect(() => {
    if (initialQuery) {
      searchMutation.mutate(initialQuery);
    }
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim()) {
      searchMutation.mutate(query.trim());
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-teal-100 text-teal-600">
            <BookOpen />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Materia Medica & Repertory</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-500">
            Search across comprehensive homeopathic databases for remedies, rubrics, and indications.
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative mx-auto w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="e.g., burning soles of feet at night, worse from cold..."
            className="rounded-full border-slate-200 py-6 pl-12 pr-24 text-lg shadow-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            type="submit"
            disabled={searchMutation.isPending || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-teal-600 text-white hover:bg-teal-700"
          >
            {searchMutation.isPending ? <Loader2 className="animate-spin" /> : "Search"}
          </Button>
        </form>

        {result ? (
          <Card className="mt-8 animate-in fade-in slide-in-from-bottom-4 border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="text-teal-600" />
                Search Results
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none bg-white p-6">
              <Markdown>{result}</Markdown>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
