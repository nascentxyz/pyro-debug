import React, { useEffect, useCallback, useState } from 'react';
import { diffChars, diffLines, diffTrimmedLines } from 'diff';
import '../App.css';

const DiffViewer = ({ graph1, graph2, onNewGraph, onDiffHighlights }) => {
  const [diffHighlights, setDiffHighlights] = useState([]);

  const generateDiffedGraph = useCallback((graph1, graph2) => {
    if (!graph1 || !graph2) return null;
    const diff = diffTrimmedLines(graph1, graph2);
    const diffHighlights = getDiffHighlights(diff);
    return diffHighlights;
  }, []);

  useEffect(() => {
    if (graph1 && graph2) {
      const highlights = generateDiffedGraph(graph1, graph2);
      onDiffHighlights(highlights);
    }
  }, [graph1, graph2]);

  if (!graph1 || !graph2) return null;

  const diff = diffTrimmedLines(graph1, graph2);
  const contextLines = 2;

  const getTrimmedDiff = (diff, contextLines) => {
    const trimmedDiff = [];
    let contextBuffer = [];

    const addContextLines = (lines, start, end) => {
      for (let i = start; i < end; i++) {
        if (i >= 0 && i < lines.length) {
          trimmedDiff.push({
            value: lines[i] + '\n',
            added: false,
            removed: false,
          });
        }
      }
    };

    diff.forEach((part, index) => {
      const lines = part.value
        .split('\n')
        .filter((line, i, arr) => i < arr.length - 1 || line.length > 0);

      if (part.added || part.removed) {
        if (contextBuffer.length > 0) {
          addContextLines(
            contextBuffer,
            Math.max(0, contextBuffer.length - contextLines),
            contextBuffer.length
          );
          contextBuffer = [];
        }

        lines.forEach((line) => {
          trimmedDiff.push({
            value: line + '\n',
            added: part.added,
            removed: part.removed,
          });
        });

        const nextPart = diff[index + 1];
        if (nextPart && !nextPart.added && !nextPart.removed) {
          const nextLines = nextPart.value
            .split('\n')
            .filter((line, i, arr) => i < arr.length - 1 || line.length > 0);
          addContextLines(nextLines, 0, contextLines);
        }
      } else {
        contextBuffer.push(...lines);
        if (contextBuffer.length > contextLines) {
          contextBuffer = contextBuffer.slice(-contextLines);
        }
      }
    });

    return trimmedDiff.length
      ? trimmedDiff
      : [{ value: 'No changes in the diff\n', added: false, removed: false }];
  };

  const trimmedDiff = getTrimmedDiff(diff, contextLines);

  const getDiffHighlights = (diff) => {
    const diffHighlights = [];
    const numbersSet = new Set();
    diff.forEach((part) => {
      if (part.added) {
        const lines = part.value.split('\n');
        lines.forEach((line) => {
          let match = line.match(/^(\d+)\(/);
          if (match) {
            numbersSet.add(match[1]);
          }
          // Match the second pattern: 25 -->|"Context(Subcontext)"| 27
          match = line.match(/(\d+)\s*-->\|.*\|\s*(\d+)/);
          if (match) {
            numbersSet.add(match[1]);
            numbersSet.add(match[2]);
          }
        });
      }
    });

    numbersSet.forEach((number) => {
      // console.log("pushing highlight", number);
      diffHighlights.push(`style ${number}`);
    });

    return diffHighlights;
  };

  return (
    <div className="graph-diff">
      <div className="diff-container">
        {trimmedDiff.map((part, index) => (
          <span
            key={index}
            style={{
              backgroundColor: part.added
                ? 'var(--added-background-color)'
                : part.removed
                  ? 'var(--removed-background-color)'
                  : 'var(--background-color)',
              whiteSpace: 'pre-wrap', // Add this line to preserve new lines
            }}
          >
            {part.value}
          </span>
        ))}
      </div>
    </div>
  );
};

export default DiffViewer;
