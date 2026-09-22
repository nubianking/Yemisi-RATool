import React, { useState } from 'react';
import { Button } from './Button';

interface OptimizeModalProps {
  onClose: () => void;
  onOptimize: (prompt: string) => Promise<void>;
}

export const OptimizeModal: React.FC<OptimizeModalProps> = ({ onClose, onOptimize }) => {
  const [prompt, setPrompt] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    if (!prompt.trim()) return;
    setIsOptimizing(true);
    setError(null);
    try {
      await onOptimize(prompt);
      onClose();
    } catch (err) {
      setError("Failed to optimize resume. Please try again.");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
          <h2 className="text-xl font-bold text-white">Optimize Resume with AI</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-400">
            Provide specific instructions to refine or calibrate the generated resume. The system will ensure all duties under experience maintain a 98% – 100% matching score against your target Job Description.
          </p>
          <textarea
            className="w-full h-32 bg-black border border-neutral-800 rounded p-4 text-sm text-neutral-200 focus:outline-none focus:border-white focus:ring-0 transition-colors resize-none placeholder-neutral-600"
            placeholder="Enter your optimization prompt here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isOptimizing}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="p-6 border-t border-neutral-800 bg-neutral-950 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isOptimizing}>Cancel</Button>
          <Button onClick={handleOptimize} disabled={!prompt.trim() || isOptimizing}>
            {isOptimizing ? "Optimizing..." : "Apply Optimization"}
          </Button>
        </div>
      </div>
    </div>
  );
};
