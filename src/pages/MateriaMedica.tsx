import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, BookOpen, Loader2 } from 'lucide-react';
import { searchMateriaMedica } from '../lib/gemini';
import Markdown from 'react-markdown';

export function MateriaMedica() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, []);

  const handleSearch = async (searchStr: string) => {
    if (!searchStr.trim()) return;
    
    setIsLoading(true);
    setSearchParams({ q: searchStr });
    
    try {
      const res = await searchMateriaMedica(searchStr);
      setResult(res);
    } catch (error) {
      console.error(error);
      setResult('An error occurred while searching the Materia Medica. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Materia Medica & Repertory</h1>
          <p className="text-slate-500 max-w-xl mx-auto">Search across comprehensive homeopathic databases for remedies, rubrics, and indications.</p>
        </div>

        <form 
          onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
          className="relative max-w-2xl mx-auto"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="e.g., burning soles of feet at night, worse from cold..." 
            className="pl-12 pr-24 py-6 text-lg rounded-full shadow-sm border-slate-200 focus-visible:ring-teal-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </form>

        {result && (
          <Card className="shadow-sm border-slate-200 mt-8 animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-teal-600" />
                Search Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-white prose prose-slate max-w-none">
              <div className="markdown-body">
                <Markdown>{result}</Markdown>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
