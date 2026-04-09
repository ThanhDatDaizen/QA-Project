/**
 * TerminalCLI.tsx - Arch Linux Authentic Terminal + Responsive
 * Proper color codes, Fira Code font, mobile-responsive
 */

import React, { useState, useRef, useEffect } from 'react';
import { CommandParser } from '../services/commandParser';
import EventSystem from '../services/eventSystem';

interface TerminalEntry {
  type: 'input' | 'output' | 'event';
  content: string;
  timestamp: Date;
}

export const TerminalCLI: React.FC = () => {
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      type: 'output',
      content: 'Arch Linux Terminal v1.0 - Type "Super --help" for commands',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Subscribe to EventSystem
  useEffect(() => {
    const unsubscribe = EventSystem.subscribe((message: string) => {
      setEntries((prev) => [
        ...prev,
        {
          type: 'event',
          content: message,
          timestamp: new Date(),
        },
      ]);
    });
    return unsubscribe;
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCommand = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing) {
      const trimmed = input.trim();
      if (trimmed === '') return;

      // ADD INPUT ENTRY IMMEDIATELY
      setEntries((prev) => [
        ...prev,
        {
          type: 'input',
          content: trimmed,
          timestamp: new Date(),
        },
      ]);

      setInput('');
      setIsProcessing(true);

      // ADD PROCESSING STATUS
      setEntries((prev) => [
        ...prev,
        {
          type: 'output',
          content: '⏳ Processing...',
          timestamp: new Date(),
        },
      ]);

      await new Promise((resolve) => setTimeout(resolve, 200));

      // EXECUTE COMMAND
      const result = await CommandParser.parseCommand(trimmed);

      // DETERMINE COMMAND TYPE
      const lowerCommand = trimmed.toLowerCase();
      let commandType: 'ideas' | 'users' | 'stats' | 'delete' | 'power' | 'help' | 'error' = 'help';
      
      if (lowerCommand.includes('--fetch') || lowerCommand.includes('--f')) {
        commandType = 'ideas';
      } else if (lowerCommand.includes('--list') || lowerCommand.includes('--u')) {
        commandType = 'users';
      } else if (lowerCommand.includes('--stats') || lowerCommand.includes('--s')) {
        commandType = 'stats';
      } else if (lowerCommand.includes('--delete')) {
        commandType = 'delete';
      } else if (lowerCommand.includes('--set-power')) {
        commandType = 'power';
      } else if (lowerCommand.includes('--help') || lowerCommand.includes('--h')) {
        commandType = 'help';
      }

      // ADD RESULT OUTPUT ENTRY - FORCE VISIBILITY
      setEntries((prev) => [
        ...prev,
        {
          type: 'output',
          content: result.output,
          timestamp: new Date(),
        },
      ]);

      // LOG SUCCESS/ERROR
      if (result.success) {
        console.log(`[TerminalCLI] ✅ Command succeeded: ${trimmed}`);
        if (commandType !== 'help') {
          EventSystem.commandExecuted(commandType);
        }
      } else {
        console.log(`[TerminalCLI] ❌ Command failed: ${trimmed}`);
        EventSystem.commandExecuted('error');
      }

      // ADD COMMAND TO HISTORY
      setCommandHistory([...commandHistory, trimmed]);
      setHistoryIndex(-1);

      setIsProcessing(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex =
        historyIndex === -1
          ? commandHistory.length - 1
          : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col overflow-hidden"
    >
      {/* Terminal Header */}
      <div className="bg-black/60 border-b border-slate-600/30 flex items-center justify-between flex-shrink-0" style={{ padding: '10px 20px' }}>
        <div className="flex items-center space-x-2">
          <div className="text-xs font-mono text-slate-400">arch</div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        <div className="text-xs font-mono text-slate-500">Terminal</div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800/50 transition-colors"
        >
          {isCollapsed ? '↑' : '↓'}
        </button>
      </div>

      {/* Terminal Content - Only show if not collapsed */}
      {!isCollapsed && (
        <>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-1 font-mono text-xs scrollbar-thin scrollbar-thumb-slate-600/50 scrollbar-track-transparent"
            style={{
              fontFamily:
                '"Fira Code", "JetBrains Mono", "Courier New", monospace',
              fontSize: isMobile ? '11px' : '12px',
              padding: '10px 20px',
              textAlign: 'left',
            }}
          >
            {entries.map((entry, idx) => (
              <div key={idx} className="flex flex-col space-y-0">
                {entry.type === 'input' ? (
                  <div className="flex items-center space-x-1">
                    <span style={{ color: '#1793d1' }}>tu</span>
                    <span style={{ color: '#ffffff' }}>@</span>
                    <span style={{ color: '#ff5555' }}>archlinux</span>
                    <span style={{ color: '#ffffff' }}> ~]$</span>
                    <span style={{ color: '#ffffff' }} className="ml-1">
                      {entry.content}
                    </span>
                  </div>
                ) : entry.type === 'event' ? (
                  <div style={{ color: '#55ff55' }} className="opacity-75">
                    {entry.content}
                  </div>
                ) : (
                  <pre
                    style={{ color: '#55ff55' }}
                    className="whitespace-pre-wrap break-words text-xs leading-relaxed"
                  >
                    {entry.content}
                  </pre>
                )}
              </div>
            ))}
            {isProcessing && (
              <div style={{ color: '#ffff55' }} className="animate-pulse">
                Processing...
              </div>
            )}
          </div>

          {/* Terminal Input */}
          <div
            className="border-t border-slate-600/30 bg-black/80 flex items-center space-x-1 flex-shrink-0"
            style={{
              fontFamily:
                '"Fira Code", "JetBrains Mono", "Courier New", monospace',
              padding: '10px 20px',
              textAlign: 'left',
            }}
          >
            <span style={{ color: '#1793d1' }}>tu</span>
            <span style={{ color: '#ffffff' }}>@</span>
            <span style={{ color: '#ff5555' }}>archlinux</span>
            <span style={{ color: '#ffffff' }}> ~]$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleCommand}
              disabled={isProcessing}
              placeholder="Type command..."
              className="flex-1 bg-transparent text-white outline-none placeholder-slate-600 ml-1 text-xs md:text-sm"
              style={{
                fontFamily:
                  '"Fira Code", "JetBrains Mono", "Courier New", monospace',
                color: '#ffffff',
              }}
              spellCheck={false}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default TerminalCLI;
